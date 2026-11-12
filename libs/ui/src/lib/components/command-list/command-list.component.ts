import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  computed,
  Component,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import { IconComponent } from '../icon/icon.component';
import { MENU_ALIGN } from '../menu/models/menu-align.const';
import { menuPositions } from '../menu/menu-positions';
import type { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import { UiOverlay } from '../../services/overlay/overlay.service';
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
 * With `popup` the list is a field with a results panel: only the field stays in place (a header
 * search), the rest (results, empty state, footer) is a glass panel in a `UiOverlay` pane under the
 * field, shown while `open` (set by typing or ArrowDown with text, cleared by Esc, a press outside,
 * the field losing focus or choosing). The first Esc closes the panel and keeps the text, the next
 * one clears it. The field keeps the combobox semantics (`aria-expanded`, `aria-controls`,
 * `aria-activedescendant`).
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
  host: {
    class: 'ui-command-list',
    '[class.ui-command-list--popup]': 'popup()',
    '(focusout)': 'onFocusout($event)',
  },
  templateUrl: './command-list.component.html',
  styleUrls: ['./command-list.component.scss', './command-list-popup.scss'],
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

  /**
   * A header field with a results panel in an overlay instead of the always-open list of a
   * dialog. Read once; do not change it while the component lives.
   */
  readonly popup = input(false, { transform: booleanAttribute });
  /** Popup mode: the panel is wanted (typing, ArrowDown); it shows only while there is text. */
  readonly open = model(false);

  /** An item was chosen (Enter, click); `background` when Ctrl or Cmd was held. */
  readonly selected = output<CommandSelection>();

  protected readonly noSelection: string[] = [];

  private readonly items = contentChildren(CommandItemComponent, { descendants: true });
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly listbox = viewChild<Listbox<string>>(Listbox);
  private readonly combo = viewChild(Combobox);
  private readonly popupEl = viewChild.required<ElementRef<HTMLElement>>('popupEl');

  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The results are on screen: always in a dialog, in popup mode while wanted and there is text. */
  protected readonly shown = computed(() => !this.popup() || (this.open() && this.query() !== ''));
  /** The popup element sits in the overlay pane (shown, or still leaving). */
  protected readonly attached = signal(false);

  private overlay: ConnectedOverlay | null = null;
  private detachSubscription: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private syncing = false;

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
    // Popup mode: Aria's `expanded` follows `shown`, also when Aria itself sets it (ArrowDown on
    // an empty field opens it for a moment).
    effect(() => {
      const aria = this.combo();
      const want = this.shown();
      if (aria && this.popup() && aria.expanded() !== want) {
        untracked(() => {
          this.syncing = true;
          aria.expanded.set(want);
          this.syncing = false;
        });
      }
    });
    effect(() => {
      const shown = this.popup() && this.shown();
      untracked(() => (shown ? this.show() : this.hide()));
    });
    // The first Esc closes the panel, the next one clears the text. Captured on the input itself,
    // before the Aria combobox (which would collapse and clear in its own way) and before a
    // surrounding handler sees it.
    const onEscape = (event: KeyboardEvent): void => this.onEscape(event);
    afterNextRender(() => {
      this.field().nativeElement.addEventListener('keydown', onEscape, true);
    });
    inject(DestroyRef).onDestroy(() => {
      this.field().nativeElement.removeEventListener('keydown', onEscape, true);
      this.stopWidthSync();
      this.detachSubscription?.unsubscribe();
      this.overlay?.dispose();
      // The pane may still hold the popup element, which Angular no longer owns.
      if (this.popup()) {
        this.popupEl().nativeElement.remove();
      }
    });
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

  /** Text typed in the field (from the Aria `value` model). */
  protected onValue(text: string): void {
    this.query.set(text);
    if (this.popup() && text !== '') {
      this.open.set(true);
    }
  }

  protected onExpandedChange(expanded: boolean): void {
    if (!this.popup() || this.syncing) {
      return;
    }
    // ArrowDown opens it, but only with text to show results for.
    this.open.set(expanded && this.query() !== '');
  }

  private onEscape(event: KeyboardEvent): void {
    if (!this.popup() || event.key !== KEYBOARD_KEY.Escape) {
      return;
    }
    if (this.shown()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.open.set(false);
    } else if (this.query() !== '') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.query.set('');
    }
  }

  /** Focus leaving the field and the panel closes the panel; the text stays. */
  protected onFocusout(event: FocusEvent): void {
    if (!this.popup()) {
      return;
    }
    const next = event.relatedTarget;
    if (
      next instanceof Node &&
      (this.host.contains(next) || this.popupEl().nativeElement.contains(next))
    ) {
      return;
    }
    // A window or tab switch has no related target while the document is not focused.
    if (next === null && !this.document.hasFocus()) {
      return;
    }
    this.open.set(false);
  }

  /** The panel keeps focus in the input: a press on an option or the scrollbar must not move it. */
  protected onPopupMousedown(event: MouseEvent): void {
    if (this.popup()) {
      event.preventDefault();
    }
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
    if (!background) {
      this.open.set(false);
    }
  }

  private show(): void {
    if (this.overlay?.isAttached) {
      this.overlay.cancelRelease();
    } else {
      this.createOverlay();
    }
    this.syncWidth();
    this.watchWidth();
    this.attached.set(true);
    afterNextRender(
      () => {
        this.overlay?.updatePosition();
      },
      { injector: this.injector },
    );
  }

  private createOverlay(): void {
    this.detachSubscription?.unsubscribe();
    this.overlay?.dispose();
    const overlay = this.overlays.connect(
      {
        origin: this.host,
        positions: menuPositions(MENU_ALIGN.Start),
        layer: OVERLAY_LAYER.Menu,
      },
      { injector: this.injector, onPositionChange: () => this.syncWidth() },
    );
    this.overlay = overlay;
    overlay.attachElement(this.popupEl().nativeElement);
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
    // The panel is removed in this render (its leave animation starts); release the pane in the
    // next one so it sees the running animations.
    afterNextRender(
      () => {
        if (!this.shown()) {
          this.overlay?.release();
        }
      },
      { injector: this.injector },
    );
  }

  /** The pane is exactly as wide as the field (measured px on purpose, as in `ui-select`). */
  private syncWidth(): void {
    const width = `${this.host.offsetWidth}px`;
    this.overlay?.pane.style.setProperty('width', width);
  }

  private watchWidth(): void {
    this.stopWidthSync();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.syncWidth();
      this.overlay?.updatePosition();
    });
    this.resizeObserver.observe(this.host);
  }

  private stopWidthSync(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
