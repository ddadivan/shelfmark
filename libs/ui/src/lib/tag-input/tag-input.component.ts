import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import type { Subscription } from 'rxjs';
import { ChipComponent } from '../chip/chip.component';
import { UiFieldControl } from '../field/field-control.directive';
import { FieldShellComponent } from '../field/field-shell.component';
import { IconComponent } from '../icon/icon.component';
import { KEYBOARD_KEY } from '../keyboard';
import { MENU_ALIGN } from '../menu/models/menu-align.const';
import { menuPositions } from '../menu/menu-positions';
import type { ConnectedOverlay } from '../overlay/connected-overlay';
import { OVERLAY_LAYER } from '../overlay/models/overlay-layer.const';
import { UiOverlay } from '../overlay/overlay.service';
import { RippleDirective } from '../ripple/ripple.directive';
import { TAG_INPUT_ICON } from './models/tag-input-icon.const';
import type { TagInputIcon } from './models/tag-input-icon.type';
import type { TagInputRow } from './models/tag-input-row.interface';
import { TAG_MAX_LENGTH } from './models/tag-max-length.const';
import { TAG_SEPARATOR } from './models/tag-separator.const';
import type { TagSuggestion } from './models/tag-suggestion.interface';
import { fillName, includesTag, normalizeTag, tagRows } from './tag-input-rows';

/**
 * Adds several tags to a link. Tags are removable `ui-chip`s inside the field box; the text input
 * is an Angular Aria `ngCombobox` (`aria-activedescendant`, DOM focus never leaves the input)
 * whose popup is an Aria `ngListbox` in a `UiOverlay` pane (layer `menu`).
 *
 * Enter or a comma adds the typed text (trimmed, cut to 50 characters, ignored when the tag is
 * already there, compared ignoring case); a pasted list with commas adds each part. With an
 * option under the arrows, Enter chooses that option instead. Backspace in the empty input
 * removes the last tag; removing a chip with its button moves focus to the next chip, the
 * previous one, or the input. At `maxTags` nothing more is added. Esc closes the list (and is
 * stopped while it is open so a surrounding dialog keeps its own Esc). Added and removed tags
 * are announced through a polite status region.
 *
 * Bind it to Signal Forms with `<ui-tag-input label="Tags" [suggestions]="tags" [formField]="f.tags" />`.
 * All visible texts come in through inputs; `{name}` in `createLabel`, `removeLabel`,
 * `addedLabel` and `removedLabel` is replaced by the tag.
 */
@Component({
  selector: 'ui-tag-input',
  imports: [
    FieldShellComponent,
    ChipComponent,
    IconComponent,
    RippleDirective,
    Combobox,
    ComboboxPopup,
    ComboboxWidget,
    Listbox,
    Option,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-tag-input',
    '(focusout)': 'onFocusout($event)',
  },
  templateUrl: './tag-input.component.html',
  styleUrl: './tag-input.component.scss',
})
export class TagInputComponent extends UiFieldControl implements FormValueControl<string[]> {
  protected readonly TAG_INPUT_ICON = TAG_INPUT_ICON;

  /** The tags, in the order they were added. */
  readonly value = model<string[]>([]);
  /** Existing tags offered while typing. */
  readonly suggestions = input<readonly TagSuggestion[]>([]);
  /** Most tags the field takes; unlimited when unset. */
  readonly maxTags = input<number>();
  readonly placeholder = input('');
  /** Replaces the placeholder at `maxTags`, for example "Up to 10 tags". */
  readonly maxTagsLabel = input('');
  /** Text of the "Create tag" row, for example `Create tag “{name}”`; without it there is no row. */
  readonly createLabel = input('');
  /** Accessible name of a chip's remove button, for example `Remove tag {name}`. */
  readonly removeLabel = input('');
  /** Announced after a tag is added, for example `Tag {name} added`. */
  readonly addedLabel = input('');
  /** Announced after a tag is removed, for example `Tag {name} removed`. */
  readonly removedLabel = input('');
  /** Announced when the tag is already there, for example `Tag {name} is already added`. */
  readonly duplicateLabel = input('');
  /** Accessible name of the suggestion list, for example "Tag suggestions"; `label` when empty. */
  readonly listLabel = input('');

  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly popup = viewChild.required<ElementRef<HTMLElement>>('popup');
  private readonly chips = viewChildren(ChipComponent);
  private readonly listbox = viewChild<Listbox<string>>(Listbox);
  private readonly combo = viewChild(Combobox);

  /** The typed text. */
  protected readonly query = signal('');
  /** The user asked for the list (typing, arrow); it shows only while there are rows. */
  private readonly wanted = signal(false);
  /** The popup element sits in the overlay pane (open, or still leaving). */
  protected readonly attached = signal(false);
  protected readonly announcement = signal('');
  protected readonly noSelection: string[] = [];

  protected readonly atLimit = computed(() => {
    const max = this.maxTags();
    return max !== undefined && this.value().length >= max;
  });
  protected readonly rows = computed(() =>
    tagRows(this.suggestions(), this.value(), this.query(), this.atLimit(), this.createLabel()),
  );
  protected readonly open = computed(() => this.wanted() && this.rows().length > 0);
  protected readonly inputPlaceholder = computed(() =>
    this.atLimit() && this.maxTagsLabel() ? this.maxTagsLabel() : this.placeholder(),
  );

  private overlay: ConnectedOverlay | null = null;
  private detachSubscription: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private syncing = false;
  /** A chip is being removed: its button is destroyed, so the focus-out has no related target. */
  private removing = false;

  constructor() {
    super();
    // Aria's `expanded` follows `open` (rows exist and the user asked), also when Aria itself
    // sets it (typing on an empty result opens it for a moment).
    effect(() => {
      const aria = this.combo();
      const want = this.open();
      if (aria && aria.expanded() !== want) {
        untracked(() => {
          this.syncing = true;
          aria.expanded.set(want);
          this.syncing = false;
        });
      }
    });
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.hide()));
    });
    // Aria activates the first option; the option Enter adds is the typed text (its exact tag or
    // the "Create tag" row), so that one is activated and announced instead.
    afterRenderEffect(() => {
      const listbox = this.listbox();
      this.rows();
      if (listbox && this.open()) {
        // The mutation observer of Angular Aria re-sorts new options in a microtask first.
        queueMicrotask(() => this.activateTyped());
      }
    });
    // Keep the active option visible while the arrows move through the list.
    afterRenderEffect(() => {
      const id = this.listbox()?.activeDescendant();
      if (id && this.open()) {
        this.document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.stopWidthSync();
      this.detachSubscription?.unsubscribe();
      this.overlay?.dispose();
      // The pane may still hold the popup element, which Angular no longer owns.
      this.popup().nativeElement.remove();
    });
  }

  /** Focuses the text input (Signal Forms calls this to focus the first invalid field). */
  focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }

  protected rowIcon(row: TagInputRow): TagInputIcon {
    return row.create ? TAG_INPUT_ICON.Create : TAG_INPUT_ICON.Tag;
  }

  protected readonly listName = computed(() => this.listLabel() || this.label());

  protected chipLabel(tag: string): string {
    return fillName(this.removeLabel(), tag);
  }

  protected onExpandedChange(expanded: boolean): void {
    if (!this.syncing) {
      this.wanted.set(expanded);
    }
  }

  /** Text changes come from Aria's `value` model; a comma ends a tag. */
  protected onQuery(text: string): void {
    if (!text.includes(TAG_SEPARATOR)) {
      this.setQuery(text.slice(0, TAG_MAX_LENGTH));
      return;
    }
    const parts = text.split(TAG_SEPARATOR);
    const rest = parts.pop() ?? '';
    for (const part of parts) {
      this.add(part);
    }
    this.setQuery(rest.slice(0, TAG_MAX_LENGTH));
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.Escape && this.open()) {
      // A dialog around the field keeps its own Esc while the list is open.
      event.stopPropagation();
      return;
    }
    if (event.key === TAG_SEPARATOR) {
      event.preventDefault();
      this.add(this.query());
      return;
    }
    if (event.key === KEYBOARD_KEY.Enter) {
      this.onEnter(event);
      return;
    }
    if (event.key === KEYBOARD_KEY.Backspace && this.query() === '' && this.value().length > 0) {
      event.preventDefault();
      this.remove(this.value().length - 1);
    }
  }

  protected onListValue(selected: readonly string[]): void {
    const key = selected[selected.length - 1];
    const row = this.rows().find((r) => r.key === key);
    this.listbox()?.value.set([]);
    if (row) {
      this.add(row.name);
    }
  }

  /** The chip's remove button or key: remove it and move focus to a sibling chip, else the input. */
  protected onChipRemoved(index: number): void {
    this.removing = true;
    this.remove(index);
    afterNextRender(
      () => {
        this.removing = false;
        const chips = this.chips();
        const target = chips[index] ?? chips[index - 1];
        if (target) {
          target.focus();
        } else {
          this.focus();
        }
      },
      { injector: this.injector },
    );
  }

  /** A press on the box (not on a chip or the input) puts the caret in the input. */
  protected onShellClick(event: MouseEvent): void {
    if (
      event.target instanceof Element &&
      !event.target.closest('button, input, label') &&
      !this.disabled()
    ) {
      this.focus();
    }
  }

  /** A press on the box padding or a chip label must not blur the input (an early `touch`). */
  protected onBoxMousedown(event: MouseEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('button, input')) {
      event.preventDefault();
    }
  }

  /** The popup keeps focus in the input: a press on an option or the scrollbar must not move it. */
  protected onPopupMousedown(event: MouseEvent): void {
    event.preventDefault();
  }

  /** `touch` fires when focus leaves the whole field (chips and input), not between them. */
  protected onFocusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.contains(next)) {
      return;
    }
    // A window or tab switch has no related target while the document is not focused.
    if (next === null && (!this.document.hasFocus() || this.removing)) {
      return;
    }
    this.announcement.set('');
    this.touch.emit();
  }

  private onEnter(event: KeyboardEvent): void {
    // While the list shows, Aria's combobox hands Enter to the listbox, which chooses the active
    // option (the typed text by default, see `activateTyped`).
    if (this.open() && this.listbox()?.activeDescendant()) {
      event.preventDefault();
      return;
    }
    if (normalizeTag(this.query())) {
      event.preventDefault();
      this.add(this.query());
    }
  }

  private setQuery(text: string): void {
    this.query.set(text);
    // The model of the Aria combobox writes the input element; keep it in step.
    const aria = this.combo();
    if (aria && aria.value() !== text) {
      aria.value.set(text);
    }
  }

  /** Makes the option that Enter adds the active one: the exact tag, else the create row. */
  private activateTyped(): void {
    const rows = this.rows();
    const text = normalizeTag(this.query()).toLocaleLowerCase();
    if (!this.open() || !text) {
      return;
    }
    const index = rows.findIndex((r) => r.create || r.name.toLocaleLowerCase() === text);
    if (index >= 0) {
      this.listbox()?.gotoIndex(index);
    }
  }

  /** Adds a tag from text; ignores empty text and duplicates, respects `maxTags`. */
  private add(text: string): void {
    const name = normalizeTag(text);
    this.setQuery('');
    this.wanted.set(false);
    if (!name) {
      return;
    }
    if (this.atLimit()) {
      this.announcement.set(this.maxTagsLabel());
      return;
    }
    if (includesTag(this.value(), name)) {
      this.announce(this.duplicateLabel(), name);
      return;
    }
    this.value.update((tags) => [...tags, name]);
    this.announce(this.addedLabel(), name);
  }

  private remove(index: number): void {
    const name = this.value()[index];
    if (name === undefined) {
      return;
    }
    this.value.update((tags) => tags.filter((_, i) => i !== index));
    this.announce(this.removedLabel(), name);
  }

  private announce(template: string, name: string): void {
    this.announcement.set(template ? fillName(template, name) : '');
  }

  private show(): void {
    const box = this.box().nativeElement;
    if (this.overlay?.isAttached) {
      this.overlay.cancelRelease();
    } else {
      this.createOverlay(box);
    }
    this.syncWidth();
    this.watchWidth(box);
    this.attached.set(true);
    afterNextRender(
      () => {
        this.overlay?.updatePosition();
      },
      { injector: this.injector },
    );
  }

  private createOverlay(box: HTMLElement): void {
    this.detachSubscription?.unsubscribe();
    this.overlay?.dispose();
    const overlay = this.overlays.connect(
      { origin: box, positions: menuPositions(MENU_ALIGN.Start), layer: OVERLAY_LAYER.Menu },
      { injector: this.injector, onPositionChange: () => this.syncWidth() },
    );
    this.overlay = overlay;
    overlay.attachElement(this.popup().nativeElement);
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.attached.set(false);
      }
    });
  }

  private hide(): void {
    if (!this.overlay) {
      return;
    }
    this.stopWidthSync();
    // The popup content is removed in this render (the leave animation starts); release the
    // pane in the next one so it sees the running animations.
    afterNextRender(
      () => {
        if (!this.open()) {
          this.overlay?.release();
        }
      },
      { injector: this.injector },
    );
  }

  /** The pane is at least as wide as the field box (measured px on purpose, as in `ui-select`). */
  private syncWidth(): void {
    this.overlay?.pane.style.setProperty('min-width', `${this.box().nativeElement.offsetWidth}px`);
  }

  private watchWidth(box: HTMLElement): void {
    this.stopWidthSync();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.syncWidth();
      this.overlay?.updatePosition();
    });
    this.resizeObserver.observe(box);
  }

  private stopWidthSync(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
