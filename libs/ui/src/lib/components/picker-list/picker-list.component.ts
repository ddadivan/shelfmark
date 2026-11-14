import { Listbox, Option } from '@angular/aria/listbox';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RippleDirective } from '../../directives/ripple/ripple.directive';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { FOLDER_ICON_SIZE } from '../folder-icon/models/folder-icon-size.const';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import type { PickerOption } from './models/picker-option.interface';
import type { PickerRow } from './models/picker-row.interface';
import { pickerRows } from './picker-rows';

const COARSE_POINTER = '(pointer: coarse)';

/** Option value of a row in the recent group: the id behind it would clash with the row's own. */
const RECENT_PREFIX = 'recent:';

/**
 * A searchable, nested list of choices that acts at once (the "Move to folder" picker): a search
 * box on top, an Angular Aria `ngListbox` below. Choosing a row emits `chosen`; there is no
 * select and no confirm button. It lives in a `ui-dialog` / `ui-sheet`, which owns Esc and the
 * focus return.
 *
 * Keyboard: focus starts in the search box (on touch screens the surrounding dialog, so the
 * keyboard does not cover the list); DOM focus stays there while ArrowDown / ArrowUp, Home / End (while
 * the box is empty, or with Ctrl / Cmd) and Enter drive the listbox through
 * `aria-activedescendant`. Typing filters by name and keeps the ancestors of a match, so a match
 * keeps its place in the tree.
 *
 * Rows in `currentIds` (the folder a link is in now) show a check and `currentLabel`, are named
 * with it, and cannot be chosen (`aria-disabled`). Nested rows are indented 16px per level and
 * named by their path (`Work / Angular`). Every string comes in through an input.
 */
@Component({
  selector: 'ui-picker-list',
  imports: [FolderIconComponent, IconComponent, Listbox, Option, RippleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-picker-list' },
  templateUrl: './picker-list.component.html',
  styleUrl: './picker-list.component.scss',
})
export class PickerListComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;

  /** The option tree. */
  readonly options = input<readonly PickerOption[]>([]);
  /** Text of the `null` row, for example "Unsorted"; no such row without it. */
  readonly emptyLabel = input('');
  /** Ids of the rows that are the current place (`null` = the empty row): marked, not choosable. */
  readonly currentIds = input<readonly (string | null)[]>([]);
  /**
   * The shown choice (side-by-side headers): that row carries the check and `aria-selected`, and
   * `currentIds` rows then show only their label (no check). `null` is the empty row; unset (the
   * default) means no row is selected, which is how the "Move to folder" picker works. Choosing
   * the shown row again emits `chosen` with the same id, so an owner can just close.
   */
  readonly value = input<string | null | undefined>(undefined);
  /**
   * Ids (`null` = the empty row) used lately, most recent first: while the search box is empty
   * they come first, in a group titled `recentLabel`, as copies of their rows. Choosing a copy
   * emits `chosen` like the row itself.
   */
  readonly recentIds = input<readonly (string | null)[]>([]);
  /** Title of the recent group, for example "Recent". */
  readonly recentLabel = input('');
  /**
   * Whether a current-place row shows the check next to its label while no `value` is shown
   * (the "Move to folder" picker does). Off, it shows the label alone, like the same row in the
   * title menu of a half (side by side).
   */
  readonly currentCheck = input(true, { transform: booleanAttribute });
  /** Text of the current-place mark, for example "Current folder". */
  readonly currentLabel = input('');
  /** Accessible name and placeholder of the search box. */
  readonly searchLabel = input.required<string>();
  /** Accessible name of the list. */
  readonly listLabel = input.required<string>();
  /** Text shown (and announced) when the search finds nothing. */
  readonly noResultsLabel = input('');
  /**
   * Take focus on open: the search box, or on touch screens (where it would open the keyboard
   * over the list) the dialog or sheet around the list. Turn it off when the list is not in a
   * modal and should not steal focus. A dialog that opens it should not move focus itself
   * (`autoFocus: false`).
   */
  readonly autoFocus = input(true, { transform: booleanAttribute });

  /** A row was chosen: its option id, or `null` for the empty row. */
  readonly chosen = output<string | null>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly listbox = viewChild(Listbox<string | null>);
  private readonly searchField = viewChild.required<ElementRef<HTMLInputElement>>('search');

  protected readonly query = signal('');
  /**
   * The keyboard (or the search text) has taken the list: only then a row is active and Enter
   * chooses. The Aria listbox starts on its first row, which must not be one Enter picks blindly.
   */
  protected readonly engaged = signal(false);
  /** Runs once the first match of the latest search is active (an Enter typed right behind the text). */
  private afterFirst: (() => void) | undefined;
  private filtering = false;
  private valueSeq = 0;
  /** The Aria listbox value: the shown row, or nothing. */
  protected readonly selection = linkedSignal<(string | null)[]>(() => {
    const value = this.value();
    return value === undefined ? [] : [value];
  });
  protected readonly rows = computed(() =>
    pickerRows(
      this.options(),
      this.query(),
      this.emptyLabel(),
      this.currentIds(),
      this.recentIds(),
    ),
  );

  constructor() {
    afterNextRender(() => {
      if (!this.autoFocus()) {
        return;
      }
      const search = this.searchField().nativeElement;
      if (this.document.defaultView?.matchMedia?.(COARSE_POINTER).matches) {
        // No keyboard over the list: focus the dialog or sheet around it, so focus is inside it.
        search.closest<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
      } else {
        search.focus({ preventScroll: true });
      }
    });
    // Keep the active row visible while the arrows move through a long list.
    afterRenderEffect(() => {
      const id = this.listbox()?.activeDescendant();
      if (id) {
        this.document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
      }
    });
  }

  protected ariaName(row: PickerRow): string | null {
    const current = row.current && this.currentLabel() ? `, ${this.currentLabel()}` : '';
    return row.level > 0 || current ? `${row.path}${current}` : null;
  }

  /** Check mark of a row: the shown value, or a current-place row while no value is shown. */
  protected showsCheck(row: PickerRow): boolean {
    const value = this.value();
    return value === undefined ? row.current && this.currentCheck() : row.id === value;
  }

  /** Aria value of a row: its id, or the prefixed id for a copy in the recent group. */
  protected optionValue(row: PickerRow): string | null {
    return row.recent ? `${RECENT_PREFIX}${row.id ?? ''}` : row.id;
  }

  protected onValue(selected: readonly (string | null)[]): void {
    const value = this.value();
    const seq = ++this.valueSeq;
    const last = selected[selected.length - 1] ?? null;
    if (typeof last === 'string' && last.startsWith(RECENT_PREFIX)) {
      // A recent copy: always a choice, even of the shown row; the selection goes back to the shown row.
      const id = last.slice(RECENT_PREFIX.length) || null;
      this.selection.set(value === undefined ? [] : [value]);
      this.chosen.emit(id);
      return;
    }
    if (selected.length > 0) {
      const id = last;
      // The shown row coming back as selected is the echo of our own reset below, not a choice.
      if (value === undefined || id !== value) {
        this.chosen.emit(id);
      }
    } else if (value !== undefined) {
      // Aria also reports an empty value for an instant while it moves the selection to another
      // row; only an empty value that stays is the shown row toggled off by choosing it again.
      queueMicrotask(() => {
        if (seq === this.valueSeq) {
          this.selection.set([value]);
          // A search that filtered the shown row out makes Aria drop it too: that is no choice.
          if (this.rows().some((row) => row.id === value)) {
            this.chosen.emit(value);
          }
        }
      });
    }
  }

  protected onSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.query.set(event.target.value);
      this.engaged.set(event.target.value !== '');
    }
    this.filtering = true;
    afterNextRender(
      () => {
        // The mutation observer of Angular Aria re-sorts the new options in a microtask first.
        queueMicrotask(() => {
          if (this.rows().length > 0) {
            this.listbox()?.gotoFirst();
          }
          this.filtering = false;
          const queued = this.afterFirst;
          this.afterFirst = undefined;
          queued?.();
        });
      },
      { injector: this.injector },
    );
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const field = this.searchField().nativeElement;
    switch (event.key) {
      case KEYBOARD_KEY.Enter:
        if (this.filtering) {
          // The list is still catching up with the text: choose its first match when it has.
          event.preventDefault();
          this.afterFirst = () => this.relay(event);
        } else if (this.engaged()) {
          this.relay(event);
        }
        break;
      case KEYBOARD_KEY.ArrowDown:
      case KEYBOARD_KEY.ArrowUp:
      case KEYBOARD_KEY.Home:
      case KEYBOARD_KEY.End:
        if (
          event.key === KEYBOARD_KEY.ArrowDown ||
          event.key === KEYBOARD_KEY.ArrowUp ||
          !field.value ||
          event.ctrlKey ||
          event.metaKey
        ) {
          this.move(event);
        }
        break;
      default:
        break;
    }
  }

  /** The first arrow key only enters the list (first row, or last for ArrowUp / End). */
  private move(event: KeyboardEvent): void {
    if (this.engaged()) {
      this.relay(event);
      return;
    }
    event.preventDefault();
    this.engaged.set(true);
    this.listbox()?.gotoFirst();
    if (event.key === KEYBOARD_KEY.ArrowUp || event.key === KEYBOARD_KEY.End) {
      // From the first row the same key wraps (ArrowUp) or jumps (End) to the last one.
      this.relay(event);
    }
  }

  /** Hands a key of the search box to the Aria listbox. */
  private relay(event: KeyboardEvent): void {
    event.preventDefault();
    // Ctrl / Cmd on Home / End only chooses the options over the caret; the listbox binds the plain key.
    const edge = event.key === KEYBOARD_KEY.Home || event.key === KEYBOARD_KEY.End;
    this.listbox()?.element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: event.key,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: edge ? false : event.ctrlKey,
        metaKey: edge ? false : event.metaKey,
      }),
    );
  }
}
