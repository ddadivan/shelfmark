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
const NO_SELECTION: (string | null)[] = [];

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
  protected readonly NO_SELECTION = NO_SELECTION;

  /** The option tree. */
  readonly options = input<readonly PickerOption[]>([]);
  /** Text of the `null` row, for example "Unsorted"; no such row without it. */
  readonly emptyLabel = input('');
  /** Ids of the rows that are the current place (`null` = the empty row): marked, not choosable. */
  readonly currentIds = input<readonly (string | null)[]>([]);
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
  protected readonly rows = computed(() =>
    pickerRows(this.options(), this.query(), this.emptyLabel(), this.currentIds()),
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

  protected onValue(selected: readonly (string | null)[]): void {
    if (selected.length > 0) {
      this.chosen.emit(selected[selected.length - 1] ?? null);
    }
  }

  protected onSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.query.set(event.target.value);
      this.engaged.set(event.target.value !== '');
    }
    afterNextRender(
      () => {
        // The mutation observer of Angular Aria re-sorts the new options in a microtask first.
        queueMicrotask(() => {
          if (this.rows().length > 0) {
            this.listbox()?.gotoFirst();
          }
        });
      },
      { injector: this.injector },
    );
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const field = this.searchField().nativeElement;
    switch (event.key) {
      case KEYBOARD_KEY.Enter:
        if (this.engaged()) {
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
