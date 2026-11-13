import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormField, FormRoot } from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import { type TagResponse } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  ICON_SIZE,
  CHIP_VARIANT,
  ChipComponent,
  EmptyStateComponent,
  InputComponent,
  KEYBOARD_KEY,
  LongPressDirective,
  markFocusReturn,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  TooltipDirective,
  type UiLongPressEvent,
} from '@shelfmark/ui';
import { TagsStore } from '../../../../stores/tags.store';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { TagActionsService } from '../../services/tag-actions.service';
import { TagEditorService } from '../../services/tag-editor.service';
import { TagMenuService } from '../../services/tag-menu.service';
import { splitTags } from '../../utils/tag-split';

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
    EmptyStateComponent,
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
  providers: [TagEditorService, TagMenuService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarTagsComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;

  /** The Tags tab of the phone: the heading is the page title (an `h1`, large) and chips are bigger. */
  readonly asPage = input(false, { transform: booleanAttribute });

  protected readonly tags = inject(TagsStore);
  private readonly viewport = inject(ViewportService);
  /** Text buttons reach the 44px touch target on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.compact() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Sm,
  );
  private readonly actions = inject(TagActionsService);
  private readonly menu = viewChild.required(MenuComponent);
  private readonly field = viewChild(InputComponent);
  private readonly addButton = viewChild('addButton', { read: ElementRef });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly expanded = signal(false);
  private readonly moreChip = viewChild('moreChip', { read: ElementRef });
  protected readonly split = computed(() => splitTags(this.tags.entities(), this.expanded()));

  protected readonly editor = inject(TagEditorService);
  protected readonly menuState = inject(TagMenuService);

  constructor() {
    void this.tags.load();
    this.editor.onSettled = (createdId) => this.cancel(true, createdId);
    // `ui-chip` has no `aria-expanded` input: the fold chip is a disclosure button, so its inner
    // button carries the state (the chip is only in the DOM while there is something to fold).
    afterRenderEffect(() => {
      this.moreChip()
        ?.nativeElement.querySelector('.ui-chip__body')
        ?.setAttribute('aria-expanded', String(this.expanded()));
    });
    // A press outside the open field closes it without saving, like Esc. The "+" button is left
    // out: its own click toggles the field, so a press on it must not also close it here.
    effect((onCleanup) => {
      if (!this.editor.editing()) {
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
        const renamedId = this.editor.renamingId();
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
    if (this.editor.adding()) {
      this.cancel();
      return;
    }
    this.editor.open('', null, true);
  }

  /** Focus left the field for another control (Tab, or a press that took focus): close it. */
  protected editorFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    const form = event.currentTarget;
    if (
      !(next instanceof Node) ||
      (form instanceof Node && form.contains(next)) ||
      this.editor.saving()
    ) {
      return;
    }
    // The "+" button toggles by its own click; a press elsewhere on a control keeps its focus.
    if (!this.addButton()?.nativeElement.contains(next)) {
      this.cancel(false);
    }
  }

  protected startRename(tag: TagResponse): void {
    this.editor.open(tag.name, tag.id, false);
  }

  /** Closes the editor; focus goes to the renamed or the new chip, else back to the "+" button. */
  protected cancel(restoreFocus = true, createdId?: string): void {
    const renamedId = this.editor.renamingId() ?? createdId ?? null;
    this.editor.close();
    if (restoreFocus) {
      afterNextRender(() => this.restoreFocus(renamedId), { injector: this.injector });
    }
  }

  private restoreFocus(renamedId: string | null): void {
    // Handing focus back is not the user moving to "+": its tooltip stays closed.
    markFocusReturn();
    const chip =
      renamedId === null
        ? null
        : this.host.querySelector<HTMLElement>(
            `ui-chip[data-tag-id="${CSS.escape(renamedId)}"] button.ui-chip__body`,
          );
    (chip ?? this.addButton()?.nativeElement.querySelector('button'))?.focus();
  }

  protected openMenuFrom(tag: TagResponse, origin: HTMLElement): void {
    this.menuState.open(tag);
    this.menu().openFrom(origin);
  }

  protected openMenuAt(tag: TagResponse, event: MouseEvent): void {
    event.preventDefault();
    this.menuState.open(tag);
    this.menu().openAt({ x: event.clientX, y: event.clientY });
  }

  protected openMenuFromLongPress(tag: TagResponse, event: UiLongPressEvent): void {
    this.menuState.open(tag);
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

  protected renameFromMenu(): void {
    const tag = this.menuState.tag();
    if (tag) {
      this.startRename(tag);
    }
  }
}
