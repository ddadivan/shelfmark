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
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import type { Subscription } from 'rxjs';
import { UiFieldControl } from '../field/field-control.directive';
import { FieldShellComponent } from '../field/field-shell.component';
import { IconComponent } from '../icon/icon.component';
import { menuPositions } from '../menu/menu-positions';
import type { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import { UiOverlay } from '../../services/overlay/overlay.service';
import { RippleDirective } from '../../directives/ripple/ripple.directive';
import type { SelectOption } from './models/select-option.interface';
import type { SelectIcon } from './models/select-icon.type';
import { SELECT_ICON } from './models/select-icon.const';
import { selectedRow, selectRows } from './select-rows';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { MENU_ALIGN } from '../menu/models/menu-align.const';
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
  styleUrl: './select.component.scss',
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

  private readonly overlays = inject(UiOverlay);
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
  /** The popup element sits in the overlay pane (open, or still leaving). */
  protected readonly attached = signal(false);
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

  private overlay: ConnectedOverlay | null = null;
  private detachSubscription: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;

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
    inject(DestroyRef).onDestroy(() => {
      this.stopWidthSync();
      this.detachSubscription?.unsubscribe();
      this.overlay?.dispose();
      // The pane may still hold the popup element, which Angular no longer owns.
      this.popup().nativeElement.remove();
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
          this.overlay?.updatePosition();
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
        this.relay(event);
        break;
      case KEYBOARD_KEY.Home:
      case KEYBOARD_KEY.End:
        if (!field?.value || event.ctrlKey || event.metaKey) {
          this.relay(event);
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

  /** Hands a key of the search box to the Aria listbox, as the combobox does for the trigger. */
  private relay(event: KeyboardEvent): void {
    event.preventDefault();
    // Ctrl / Cmd on Home / End only chooses the options over the caret; Aria's single-select
    // listbox binds the plain key, so those two modifiers are dropped there.
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

  private show(): void {
    if (this.open()) {
      return;
    }
    this.query.set('');
    this.open.set(true);
    const trigger = this.trigger().nativeElement;
    if (this.overlay?.isAttached) {
      // Reopened while the leave animation runs.
      this.overlay.cancelRelease();
    } else {
      this.createOverlay(trigger);
    }
    this.syncWidth();
    this.watchWidth(trigger);
    this.attached.set(true);
    afterNextRender(
      () => {
        this.overlay?.updatePosition();
      },
      { injector: this.injector },
    );
  }

  private createOverlay(trigger: HTMLElement): void {
    this.detachSubscription?.unsubscribe();
    this.overlay?.dispose();
    const overlay = this.overlays.connect(
      { origin: trigger, positions: menuPositions(MENU_ALIGN.Start), layer: OVERLAY_LAYER.Menu },
      { injector: this.injector, onPositionChange: () => this.syncWidth() },
    );
    this.overlay = overlay;
    overlay.attachElement(this.popup().nativeElement);
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.attached.set(false);
        if (this.open()) {
          this.open.set(false);
        }
      }
    });
  }

  private hide(restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.stopWidthSync();
    if (restoreFocus) {
      this.focus();
    }
    this.touch.emit();
    // The popup content is removed in this render (the leave animation starts); release the
    // pane in the next one so it sees the running animations.
    afterNextRender(
      () => {
        this.overlay?.release();
      },
      { injector: this.injector },
    );
  }

  /** The pane is at least as wide as the trigger; re-read on every reposition and resize. */
  private syncWidth(): void {
    this.overlay?.pane.style.setProperty(
      'min-width',
      `${this.trigger().nativeElement.offsetWidth}px`,
    );
  }

  private watchWidth(trigger: HTMLElement): void {
    this.stopWidthSync();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.syncWidth();
      this.overlay?.updatePosition();
    });
    this.resizeObserver.observe(trigger);
  }

  private stopWidthSync(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
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
