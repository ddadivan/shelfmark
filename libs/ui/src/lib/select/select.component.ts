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
import type { ConnectedOverlay } from '../overlay/connected-overlay';
import { UiOverlay } from '../overlay/overlay.service';
import { RippleDirective } from '../ripple/ripple.directive';
import type { SelectOption } from './models/select-option.interface';
import { selectedRow, selectRows } from './select-rows';

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
  protected readonly triggerIcon = computed(() => (this.value() === null ? 'inbox' : 'folder'));

  private overlay: ConnectedOverlay | null = null;
  private detachSubscription: Subscription | null = null;

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

  protected onExpandedChange(expanded: boolean): void {
    if (expanded) {
      this.show();
    } else {
      this.hide(false);
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    // A dialog around the select keeps its own Esc while the popup is open.
    if (event.key === 'Escape' && this.open()) {
      event.stopPropagation();
    }
  }

  protected onTriggerBlur(): void {
    // Opening moves focus into the search box, which is no blur of the field.
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
    // Aria closes the popup once neither the trigger nor the popup has focus.
    this.widget()?.onFocusout(event);
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    afterNextRender(
      () => {
        // The mutation observer of Angular Aria re-sorts the new options in a microtask first.
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
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
        this.relay(event);
        break;
      case 'Home':
      case 'End':
        if (!field?.value || event.ctrlKey || event.metaKey) {
          this.relay(event);
        }
        break;
      case 'Escape':
        event.stopPropagation();
        event.preventDefault();
        this.hide(true);
        break;
      case 'Tab':
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
    this.listbox()?.element.dispatchEvent(new KeyboardEvent('keydown', { key: event.key }));
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
    this.overlay?.pane.style.setProperty('min-width', `${trigger.offsetWidth}px`);
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
      { origin: trigger, positions: menuPositions('start'), layer: 'menu' },
      { injector: this.injector },
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
}
