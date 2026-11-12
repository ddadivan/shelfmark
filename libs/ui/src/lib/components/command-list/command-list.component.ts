import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  computed,
  Component,
  contentChildren,
  ElementRef,
  input,
  model,
  output,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { IME_KEY_CODE } from './models/ime-key-code.const';
import { scrollIntoList } from './scroll-into-list';
import { CommandItemComponent } from './command-item/command-item.component';
import type { CommandSection } from './models/command-section.interface';
import type { CommandSelection } from './models/command-selection.interface';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * A search-and-choose list for a command palette (the search dialog). The text input is an
 * Angular Aria `ngCombobox` (`role="combobox"`, `aria-activedescendant`; DOM focus never leaves
 * it) that is always expanded; the results are an Aria `ngListbox` of `ui-command-item` options,
 * optionally in `ui-command-group`s (`role="group"` named by the heading).
 *
 * Keys: Up and Down move through the options and wrap around, Home and End jump to the first and
 * last, Enter emits `selected`, Ctrl or Cmd with Enter (or a click) emits it with
 * `background: true`. The list does not filter: the feature sets `query`, loads results and
 * renders the items; `busy` marks the results as updating (`aria-busy`).
 *
 * Slots: `slot="input-end"` (after the input, for example an `Esc` hint), `slot="empty"` (shown
 * in a status region while there are no items), `slot="footer"` (keyboard hints, `kbd` is
 * styled). All texts come in through inputs or projected content.
 *
 * ```html
 * <ui-command-list inputLabel="Search" [(query)]="q" [busy]="loading()" (selected)="open($event)">
 *   <ui-command-group heading="3 links">
 *     <ui-command-item value="a">Signals <span slot="meta">youtube.com</span></ui-command-item>
 *   </ui-command-group>
 * </ui-command-list>
 * ```
 */
@Component({
  selector: 'ui-command-list',
  imports: [
    NgTemplateOutlet,
    IconComponent,
    Combobox,
    ComboboxPopup,
    ComboboxWidget,
    Listbox,
    Option,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ui-command-list' },
  templateUrl: './command-list.component.html',
  styleUrl: './command-list.component.scss',
})
export class CommandListComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  /** The search text. */
  readonly query = model('');
  /** Accessible name of the search input (required, for example "Search links, folders and tags"). */
  readonly inputLabel = input.required<string>();
  readonly placeholder = input('');
  /** Accessible name of the results list, for example "Search results" (differs from `inputLabel`). */
  readonly listLabel = input.required<string>();
  /** The results are being updated: `aria-busy` on the list. */
  readonly busy = input(false, { transform: booleanAttribute });

  /** An item was chosen (Enter, click); `background` when Ctrl or Cmd was held. */
  readonly selected = output<CommandSelection>();

  protected readonly noSelection: string[] = [];

  private readonly items = contentChildren(CommandItemComponent, { descendants: true });
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly listbox = viewChild<Listbox<string>>(Listbox);

  /** The items in order, grouped by neighbouring items of the same group. */
  protected readonly sections = computed<CommandSection[]>(() => {
    const sections: CommandSection[] = [];
    for (const item of this.items()) {
      const last = sections[sections.length - 1];
      if (last && last.group === item.group) {
        last.items.push(item);
      } else {
        sections.push({ group: item.group, items: [item] });
      }
    }
    return sections;
  });
  protected readonly empty = computed(() => this.items().length === 0);

  constructor() {
    // The active option must always be a row that exists and is enabled: after the items or the
    // query change, a missing or disabled active row is replaced by the first enabled one, and a
    // new query starts again at the top (the best match comes first). Results usually arrive after
    // the query, so a query change also stays pending until the items next change, which resets
    // to the top once more.
    let lastQuery = this.query();
    let lastIds = '';
    let resetPending = false;
    afterRenderEffect(() => {
      const listbox = this.listbox();
      const items = this.items();
      const query = this.query();
      // Read the flags here so a row that becomes disabled re-runs the effect.
      items.forEach((item) => item.disabled());
      const queryChanged = query !== lastQuery;
      lastQuery = query;
      const ids = items.map((item) => item.id).join('|');
      const itemsChanged = ids !== lastIds;
      lastIds = ids;
      resetPending = resetPending || queryChanged;
      const resetToTop = queryChanged || (resetPending && itemsChanged);
      if (itemsChanged) {
        resetPending = false;
      }
      if (!listbox) {
        return;
      }
      untracked(() => {
        const first = items.findIndex((item) => !item.disabled());
        const active = items.find((item) => item.id === listbox.activeDescendant());
        if (first >= 0 && (resetToTop || !active || active.disabled())) {
          // Aria sorts new options into its collection in a microtask.
          queueMicrotask(() => listbox.gotoIndex(first));
        }
      });
    });
    // Keep the option under the arrow keys in view by scrolling the list itself (not the page or
    // the dialog around it); DOM focus stays in the input.
    afterRenderEffect(() => {
      const listbox = this.listbox();
      const id = this.liveActive(listbox?.activeDescendant());
      const option = id ? listbox?.element.querySelector<HTMLElement>(`[id="${id}"]`) : null;
      if (listbox && option) {
        untracked(() => scrollIntoList(listbox.element, option));
      }
    });
  }

  /** Focuses the search input. */
  focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // keyCode 229 is the Enter that confirms an IME composition (some browsers send it without
    // `isComposing`).
    if (event.key !== KEYBOARD_KEY.Enter || event.isComposing || event.keyCode === IME_KEY_CODE) {
      return;
    }
    // The Aria combobox relays a plain Enter to the listbox, which toggles its own selection
    // (reset in `onListValue`); the choice itself is emitted here, with the modifier.
    const item = this.activeItem();
    if (item) {
      event.preventDefault();
      this.choose(item, event.ctrlKey || event.metaKey);
    }
  }

  /** Aria's own selection state is not used; it is reset so the same row can be chosen again. */
  protected onListValue(): void {
    this.listbox()?.value.set([]);
  }

  protected onOptionClick(item: CommandItemComponent, event: MouseEvent): void {
    if (!item.disabled()) {
      this.choose(item, event.ctrlKey || event.metaKey);
    }
  }

  /** A press in the list must not move focus out of the input. */
  protected onListMousedown(event: MouseEvent): void {
    event.preventDefault();
  }

  /** The active id only while its row exists (Aria clears it a moment after a row is removed). */
  protected liveActive(id: string | undefined): string | undefined {
    return id && this.items().some((item) => item.id === id) ? id : undefined;
  }

  private activeItem(): CommandItemComponent | undefined {
    const id = this.listbox()?.activeDescendant();
    return id ? this.items().find((item) => item.id === id && !item.disabled()) : undefined;
  }

  private choose(item: CommandItemComponent, background: boolean): void {
    this.selected.emit({ value: item.value(), background });
  }
}
