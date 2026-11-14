import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { UiFieldControl } from '../field/field-control.directive';
import { FieldShellComponent } from '../field/field-shell.component';
import { IconComponent } from '../icon/icon.component';
import { FieldPopup } from '../../services/overlay/field-popup';
import { RippleDirective } from '../../directives/ripple/ripple.directive';
import type { SelectOption } from './models/select-option.interface';
import type { SelectIcon } from './models/select-icon.type';
import { SELECT_ICON } from './models/select-icon.const';
import { relayKey } from './relay-key';
import { selectedRow, selectRows } from './select-rows';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { ICON_SIZE } from '../icon/models/icon-size.const';

/**
 * Picks one value from a nested list (the folder of a link). The trigger is an Angular Aria
 * `ngCombobox` button, the popup an Aria `ngListbox` (`aria-activedescendant`: DOM focus stays on
 * the trigger, or in the search box) in a `UiOverlay` pane (layer `menu`) that grows from the
 * field (`--ui-origin`). Nested levels are indented 16px; each nested option is also named by its
 * path (`Work / Angular`), so the nesting is not only visual.
 *
 * Bind it to Signal Forms with `<ui-select label="Folder" [options]="folders" [formField]="f.folder" />`.
 * The value is the option id, or `null` for the empty option (`emptyLabel`, for example
 * "Unsorted"; without it there is no empty option and `placeholder` shows for `null`).
 *
 * `searchable` adds a search box in the popup (focus moves into it): typing filters, matches keep
 * their ancestors, ArrowUp / ArrowDown move, Enter chooses, and Home / End move through the options
 * while the box is empty (or with Ctrl / Cmd) so they still edit the text otherwise. Without
 * search, typing jumps to an option (typeahead). Esc closes and keeps the value; focus returns to
 * the trigger. The overlay lives in `<body>` and takes the theme of `<html>`.
 */
@Component({
  selector: 'ui-select',
  imports: [
    FieldShellComponent,
    IconComponent,
    RippleDirective,
    Combobox,
    ComboboxPopup,
    ComboboxWidget,
    Listbox,
    Option,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-select' },
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss', './select-list.scss'],
})
export class SelectComponent extends UiFieldControl implements FormValueControl<string | null> {
  protected readonly ICON_SIZE = ICON_SIZE;
  /** Id of the chosen option, or `null` for the empty option or no choice. */
  readonly value = model<string | null>(null);
  /** The option tree. */
  readonly options = input<readonly SelectOption[]>([]);
  /** Shows a search box in the popup. */
  readonly searchable = input(false, { transform: booleanAttribute });
  /** Text of the `null` option, for example "Unsorted"; no empty option without it. */
  readonly emptyLabel = input('');
  /** Trigger text while nothing is chosen (and `null` has no `emptyLabel`). */
  readonly placeholder = input('');
  /** Accessible name and placeholder of the search box; required with `searchable`. */
  readonly searchLabel = input('');
  /** Text shown when the search finds nothing. */
  readonly noResultsLabel = input('');

  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly popup = viewChild.required<ElementRef<HTMLElement>>('popup');
  private readonly listbox = viewChild<Listbox<string | null>>(Listbox);
  private readonly widget = viewChild(ComboboxWidget);
  private readonly combo = viewChild(Combobox);
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('search');

  /** The popup is open (the Aria combobox `expanded` state). */
  protected readonly open = signal(false);
  protected readonly query = signal('');

  protected readonly rows = computed(() =>
    selectRows(this.options(), this.searchable() ? this.query() : '', this.emptyLabel()),
  );
  protected readonly selection = computed(() => [this.value()]);
  protected readonly chosen = computed(() =>
    selectedRow(this.options(), this.value(), this.emptyLabel()),
  );
  protected readonly triggerText = computed(() => this.chosen()?.path ?? this.placeholder());
  protected readonly triggerIcon = computed(() => this.rowIcon(this.value()));

  /** The list's overlay pane, at least as wide as the trigger. */
  private readonly pane = new FieldPopup({
    origin: () => this.trigger().nativeElement,
    popup: () => this.popup().nativeElement,
    isShown: () => this.open(),
    onDetached: () => {
      if (this.open()) {
        this.open.set(false);
      }
    },
  });
  /** The popup element sits in the overlay pane (open, or still leaving). */
  protected readonly attached = this.pane.attached;

  constructor() {
    super();
    // The search box takes focus as soon as it exists (the popup content renders after opening).
    effect(() => {
      const field = this.searchField();
      if (field) {
        untracked(() => {
          field.nativeElement.focus({ preventScroll: true });
        });
      }
    });
    // Keep the active option visible while the arrows move through a long list.
    afterRenderEffect(() => {
      const id = this.listbox()?.activeDescendant();
      if (id && this.open()) {
        this.document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' });
      }
    });
  }

  /** Focuses the trigger (Signal Forms calls this to focus the first invalid field). */
  focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  /** Folder icon, or the inbox for the empty option. */
  protected rowIcon(id: string | null): SelectIcon {
    return id === null ? SELECT_ICON.Empty : SELECT_ICON.Folder;
  }

  protected onExpandedChange(expanded: boolean): void {
    if (expanded) {
      this.show();
    } else if (this.open() && this.windowBlurred()) {
      // Aria closes the popup when the window loses focus; focus is still on the select, so
      // the popup stays and Aria's state is put back.
      this.combo()?.expanded.set(true);
    } else {
      this.hide(false);
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    // A dialog around the select keeps its own Esc while the popup is open.
    if (event.key === KEYBOARD_KEY.Escape && this.open()) {
      event.stopPropagation();
    }
  }

  protected onTriggerBlur(event: FocusEvent): void {
    // Blur from a window or tab switch (no related target, document not focused) is no blur of
    // the field. Opening moves focus into the search box, which is no blur of it either.
    if (event.relatedTarget === null && !this.document.hasFocus()) {
      return;
    }
    if (!this.open()) {
      this.touch.emit();
    }
  }

  /** Clicking the label (outside the button) has nothing to focus natively. */
  protected onHostClick(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest('label')) {
      this.focus();
    }
  }

  protected onListValue(selected: readonly (string | null)[]): void {
    if (selected.length > 0) {
      this.value.set(selected[selected.length - 1] ?? null);
    } else if (!this.rows().some((row) => row.id === this.value())) {
      // Aria drops a selected value whose option the filter removed: not a choice.
      return;
    }
    // An empty list with the current option still visible is a repeated choice of it (Aria
    // toggles it off): the value stays and the popup closes like for any choice.
    this.hide(true);
  }

  /** The popup keeps focus where it is (trigger or search box): a press on an option or the list's scrollbar must not move it. */
  protected onPopupMousedown(event: MouseEvent): void {
    if (!(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
    }
  }

  protected onPopupFocusin(): void {
    this.widget()?.onFocusin();
  }

  protected onPopupFocusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.popup().nativeElement.contains(next)) {
      return;
    }
    if (next === null && !this.document.hasFocus()) {
      return;
    }
    // Aria closes the popup once neither the trigger nor the popup has focus.
    this.widget()?.onFocusout(event);
  }

  protected onSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.query.set(event.target.value);
    }
    afterNextRender(
      () => {
        // The mutation observer of Angular Aria re-sorts the new options in a microtask first, so
        // the first option is activated after it. Covered by the spec "filters while typing, keeps
        // ancestors and activates the first match".
        queueMicrotask(() => {
          if (this.open() && this.rows().length > 0) {
            this.listbox()?.gotoFirst();
          }
          this.pane.updatePosition();
        });
      },
      { injector: this.injector },
    );
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const field = this.searchField()?.nativeElement;
    switch (event.key) {
      case KEYBOARD_KEY.ArrowDown:
      case KEYBOARD_KEY.ArrowUp:
      case KEYBOARD_KEY.Enter:
        relayKey(event, this.listbox()?.element);
        break;
      case KEYBOARD_KEY.Home:
      case KEYBOARD_KEY.End:
        if (!field?.value || event.ctrlKey || event.metaKey) {
          relayKey(event, this.listbox()?.element);
        }
        break;
      case KEYBOARD_KEY.Escape:
        event.stopPropagation();
        event.preventDefault();
        this.hide(true);
        break;
      case KEYBOARD_KEY.Tab:
        // Focus goes back to the trigger first, so Tab moves on from there.
        this.hide(true);
        break;
      default:
        break;
    }
  }

  private show(): void {
    if (this.open()) {
      return;
    }
    this.query.set('');
    this.open.set(true);
    this.pane.show();
  }

  private hide(restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.pane.hide();
    if (restoreFocus) {
      this.focus();
    }
    this.touch.emit();
  }

  /** The document lost focus (window or tab switch) while an element in it keeps it. */
  private windowBlurred(): boolean {
    const active = this.document.activeElement;
    return (
      !this.document.hasFocus() &&
      !!active &&
      (active === this.trigger().nativeElement || this.popup().nativeElement.contains(active))
    );
  }
}
