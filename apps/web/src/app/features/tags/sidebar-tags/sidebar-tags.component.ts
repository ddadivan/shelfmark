import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TAG_LIMIT, normalizeTagName, type TagResponse } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  ICON_SIZE,
  ChipComponent,
  InputComponent,
  KEYBOARD_KEY,
  LongPressDirective,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  TOAST_KIND,
  TooltipDirective,
  ToastService,
  type UiLongPressEvent,
} from '@shelfmark/ui';
import { TAG_OUTCOME } from '../../../stores/models/tag-outcome.const';
import { TagsStore } from '../../../stores/tags.store';
import { ViewportService } from '../../../core/layout/viewport.service';
import { TagActionsService } from '../tag-actions.service';
import { splitTags } from '../tag-split';

/**
 * The tags section of the sidebar: the most used tags as chips ("+N more" shows the rest), an
 * inline "+" field for a new tag (Enter saves, Esc cancels) and a menu per tag from right click,
 * the chip's "..." button, Shift+F10 or a long press: show links, rename, merge, delete. Rename
 * happens in place; a name that exists offers to merge instead.
 */
@Component({
  selector: 'app-sidebar-tags',
  imports: [
    ButtonComponent,
    ChipComponent,
    FormField,
    FormRoot,
    InputComponent,
    LongPressDirective,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    NgTemplateOutlet,
    TooltipDirective,
    TranslocoPipe,
  ],
  templateUrl: './sidebar-tags.component.html',
  styleUrl: './sidebar-tags.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarTagsComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;

  protected readonly tags = inject(TagsStore);
  private readonly viewport = inject(ViewportService);
  /** Text buttons reach the 44px touch target on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.phone() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Sm,
  );
  private readonly actions = inject(TagActionsService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly menu = viewChild.required(MenuComponent);
  private readonly field = viewChild(InputComponent);
  private readonly addButton = viewChild('addButton', { read: ElementRef });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  /** Ticks when the active language or its translations change, so messages re-translate. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  protected readonly expanded = signal(false);
  protected readonly split = computed(() => splitTags(this.tags.entities(), this.expanded()));

  /** The "+" field is open. */
  protected readonly adding = signal(false);
  /** `id` of the tag being renamed in place. */
  protected readonly renamingId = signal<string | null>(null);
  protected readonly editing = computed(() => this.adding() || this.renamingId() !== null);
  private readonly model = signal({ name: '' });
  protected readonly form = form(this.model, () => undefined, {
    submission: { action: () => this.save() },
  });
  protected readonly saving = signal(false);
  private readonly errorState = signal<{
    key: string;
    params?: Record<string, unknown>;
  } | null>(null);
  /** The message under the field, translated again when the language changes. */
  protected readonly fieldError = computed(() => {
    this.i18n();
    const error = this.errorState();
    return error ? this.transloco.translate(error.key, error.params) : '';
  });
  /** The existing tag a rename ran into: the merge is offered. */
  protected readonly conflict = signal<TagResponse | null>(null);

  /** `id` of the tag whose menu is open. */
  protected readonly menuTagId = signal<string | null>(null);
  protected readonly menuLabel = computed(() => {
    const tag = this.menuTag();
    return tag ? this.transloco.translate('tags.sidebar.menuFor', { name: tag.name }) : undefined;
  });
  /** The tag the menu was opened for; kept while an item is chosen and the menu closes. */
  private menuTargetId: string | null = null;

  constructor() {
    void this.tags.load();
    // A press outside the open field closes it without saving, like Esc. The "+" button is left
    // out: its own click toggles the field, so a press on it must not also close it here.
    effect((onCleanup) => {
      if (!this.editing()) {
        return;
      }
      const doc = this.host.ownerDocument;
      const onPress = (event: Event): void => {
        const target = event.target;
        if (
          !(target instanceof Element) ||
          target.closest('.tags__editor') ||
          this.addButton()?.nativeElement.contains(target)
        ) {
          return;
        }
        const renamedId = this.renamingId();
        this.cancel(false);
        // Once the press has settled: when it left focus nowhere (a click on empty space), the
        // "+" button (or the renamed chip) takes it; a control that took focus keeps it.
        setTimeout(() => {
          const active = doc.activeElement;
          // Nowhere, or on a container around the sidebar (the drawer panel): nothing took it.
          if (!active || active === doc.body || active.contains(this.host)) {
            this.restoreFocus(renamedId);
          }
        });
      };
      doc.addEventListener('pointerdown', onPress, true);
      onCleanup(() => doc.removeEventListener('pointerdown', onPress, true));
    });
    // The field takes focus when it opens (an `afterRenderEffect`: the input exists only after render).
    afterRenderEffect(() => {
      this.field()?.focus();
    });
  }

  protected retry(): void {
    void this.tags.load();
  }

  protected toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  protected show(tag: TagResponse): void {
    void this.actions.showLinks(tag.name);
  }

  /** The "+" button: opens the field, or closes it when it is open (one click, one toggle). */
  protected toggleAdd(): void {
    if (this.adding()) {
      this.cancel();
      return;
    }
    this.openEditor('', null, true);
  }

  /** Focus left the field for another control (Tab, or a press that took focus): close it. */
  protected editorFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    const form = event.currentTarget;
    if (!(next instanceof Node) || (form instanceof Node && form.contains(next)) || this.saving()) {
      return;
    }
    // The "+" button toggles by its own click; a press elsewhere on a control keeps its focus.
    if (!this.addButton()?.nativeElement.contains(next)) {
      this.cancel(false);
    }
  }

  protected startRename(tag: TagResponse): void {
    this.openEditor(tag.name, tag.id, false);
  }

  /** Closes the editor; focus goes back to the renamed chip, or to the "+" button. */
  protected cancel(restoreFocus = true): void {
    const renamedId = this.renamingId();
    this.adding.set(false);
    this.renamingId.set(null);
    this.errorState.set(null);
    this.conflict.set(null);
    if (restoreFocus) {
      afterNextRender(() => this.restoreFocus(renamedId), { injector: this.injector });
    }
  }

  private restoreFocus(renamedId: string | null): void {
    const chip =
      renamedId === null
        ? null
        : this.host.querySelector<HTMLElement>(
            `ui-chip[data-tag-id="${CSS.escape(renamedId)}"] button.ui-chip__body`,
          );
    (chip ?? this.addButton()?.nativeElement.querySelector('button'))?.focus();
  }

  protected async mergeIntoConflict(): Promise<void> {
    const target = this.conflict();
    const source = this.tags.entityMap()[this.renamingId() ?? ''];
    if (!target || !source || this.saving()) {
      return;
    }
    this.saving.set(true);
    const merged = await this.actions.mergeInto(source, target);
    this.saving.set(false);
    if (merged) {
      this.cancel();
    }
  }

  protected openMenuFrom(tag: TagResponse, origin: HTMLElement): void {
    this.setMenuTag(tag);
    this.menu().openFrom(origin);
  }

  protected openMenuAt(tag: TagResponse, event: MouseEvent): void {
    event.preventDefault();
    this.setMenuTag(tag);
    this.menu().openAt({ x: event.clientX, y: event.clientY });
  }

  protected openMenuFromLongPress(tag: TagResponse, event: UiLongPressEvent): void {
    this.setMenuTag(tag);
    this.menu().openAt({ x: event.x, y: event.y });
  }

  protected openMenuFromKeyboard(tag: TagResponse, event: KeyboardEvent): void {
    if (
      event.key === KEYBOARD_KEY.ContextMenu ||
      (event.shiftKey && event.key === KEYBOARD_KEY.F10)
    ) {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLElement) {
        this.openMenuFrom(tag, event.currentTarget);
      }
    }
  }

  protected menuClosed(): void {
    this.menuTagId.set(null);
  }

  protected showFromMenu(): void {
    const tag = this.menuTag();
    if (tag) {
      this.show(tag);
    }
  }

  protected renameFromMenu(): void {
    const tag = this.menuTag();
    if (tag) {
      this.startRename(tag);
    }
  }

  protected mergeFromMenu(): void {
    const tag = this.menuTag();
    if (tag) {
      void this.actions.merge(tag);
    }
  }

  protected deleteFromMenu(): void {
    const tag = this.menuTag();
    if (tag) {
      void this.actions.delete(tag);
    }
  }

  private menuTag(): TagResponse | undefined {
    const id = this.menuTagId() ?? this.menuTargetId;
    return id === null ? undefined : this.tags.entityMap()[id];
  }

  private setMenuTag(tag: TagResponse): void {
    this.menuTargetId = tag.id;
    this.menuTagId.set(tag.id);
  }

  private openEditor(name: string, renamingId: string | null, adding: boolean): void {
    this.errorState.set(null);
    this.conflict.set(null);
    this.model.set({ name });
    this.renamingId.set(renamingId);
    this.adding.set(adding);
  }

  /** Enter in the field: create or rename. A refused name keeps the field open with the reason. */
  private async save(): Promise<undefined> {
    if (this.saving()) {
      return;
    }
    const name = normalizeTagName(this.model().name);
    const error = this.validate(name);
    if (error) {
      this.errorState.set({ key: error.key, params: { max: error.max } });
      return;
    }
    const renamingId = this.renamingId();
    const previous = renamingId === null ? undefined : this.tags.entityMap()[renamingId];
    if (previous && previous.name === name) {
      this.cancel();
      return;
    }
    this.saving.set(true);
    this.errorState.set(null);
    this.conflict.set(null);
    const result = previous
      ? await this.tags.rename(previous.id, name)
      : await this.tags.create(name);
    this.saving.set(false);
    switch (result.outcome) {
      case TAG_OUTCOME.Done:
        if (previous) {
          this.actions.renamed(previous.name, name);
        } else {
          this.toasts.show({
            kind: TOAST_KIND.Success,
            text: this.transloco.translate('tags.add.done', { name }),
          });
        }
        this.cancel();
        break;
      case TAG_OUTCOME.Conflict:
        if (previous && result.tag) {
          this.conflict.set(result.tag);
        } else {
          this.errorState.set({ key: 'tags.name.exists', params: { name } });
        }
        break;
      case TAG_OUTCOME.LimitReached:
        this.errorState.set({ key: 'tags.add.limit', params: { max: TAG_LIMIT.PerUserMax } });
        break;
      default:
        this.errorState.set({ key: previous ? 'tags.rename.failed' : 'tags.add.failed' });
        break;
    }
    return;
  }

  /** The translation key (and its limit) of what is wrong with a new name, if anything. */
  private validate(name: string): { key: string; max: number } | null {
    if (name === '') {
      return { key: 'tags.name.required', max: TAG_LIMIT.NameMax };
    }
    if (name.length > TAG_LIMIT.NameMax) {
      return { key: 'tags.name.tooLong', max: TAG_LIMIT.NameMax };
    }
    if (!this.renamingId() && this.tags.atLimit()) {
      return { key: 'tags.add.limit', max: TAG_LIMIT.PerUserMax };
    }
    return null;
  }
}
