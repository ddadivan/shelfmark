import { Grid, GridCell, GridRow } from '@angular/aria/grid';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import type { Subscription } from 'rxjs';
import { UiFieldControl } from '../field/field-control.directive';
import { FieldShellComponent } from '../field/field-shell.component';
import { nextFieldId } from '../field/field-ids';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { SpinnerComponent } from '../spinner/spinner.component';
import { menuPositions } from '../menu/menu-positions';
import { MENU_ALIGN } from '../menu/models/menu-align.const';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { KEYBOARD_KEY } from '../../models/keyboard';
import type { ConnectedOverlay } from '../../services/overlay/connected-overlay';
import { UiOverlay } from '../../services/overlay/overlay.service';
import { OVERLAY_EDGE } from '../../services/overlay/models/overlay-edge.const';
import { OVERLAY_LAYER } from '../../services/overlay/models/overlay-layer.const';
import {
  lastInputWasPointer,
  returnFocus,
  trackInputModality,
} from '../../services/dialog/focus-return';
import { mediaMatch } from '../../utils/media/media-match';
import { PHONE_MEDIA_QUERY } from '../../utils/media/models/phone-media-query.const';
import { emojiRows, searchEmoji } from './emoji-search';
import { EMOJI_PICKER_COLUMNS } from './models/emoji-picker-columns.const';
import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';
import type { EmojiPickerItem } from './models/emoji-picker-item.interface';
import type { EmojiPickerSection } from './models/emoji-picker-section.interface';

/** Tabbable stops of the open panel, in order (roving grids and tabs expose one each). */
const PANEL_STOPS = 'input, button:not([tabindex="-1"]), [tabindex="0"]';

/**
 * Picks one emoji (the folder icon, #363). The field is a text input, so typing or pasting an
 * emoji still works; a click, Enter or ArrowDown opens a glass panel (`UiOverlay` layer `menu`,
 * anchored to the field; a bottom sheet below 40em) with a search box, category tabs (Angular Aria
 * tabs) and grids of emoji (Angular Aria grids: arrows move, Enter or Space chooses). "Recent" and
 * "Yours" sit above the category while they have emoji; an own emoji with a `removeLabel` shows a
 * "×" and Delete / Backspace removes it (`removed`; the feature forgets it). Esc closes and hands
 * focus back to the field without a tooltip (#356). Names come in translated with the items; the
 * feature loads them lazily on `opened`, and a spinner shows until `categories` arrive.
 */
@Component({
  selector: 'ui-emoji-picker',
  imports: [
    ButtonComponent,
    FieldShellComponent,
    Grid,
    GridCell,
    GridRow,
    IconComponent,
    NgTemplateOutlet,
    SpinnerComponent,
    Tab,
    TabContent,
    TabList,
    TabPanel,
    Tabs,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-emoji-picker' },
  templateUrl: './emoji-picker.component.html',
  styleUrls: [
    './emoji-picker.component.scss',
    './emoji-picker-panel.scss',
    './emoji-picker-grid.scss',
  ],
})
export class EmojiPickerComponent extends UiFieldControl implements FormValueControl<string> {
  protected readonly ICON_SIZE = ICON_SIZE;
  /** The emoji (or the text typed so far); empty when none is chosen. */
  readonly value = model('');
  /** Field text while it is empty ("Choose an emoji"). */
  readonly placeholder = input('');
  /** The tabs, each with its emoji; empty until loaded (a spinner shows). */
  readonly categories = input<readonly EmojiPickerCategory[]>([]);
  /** Recently chosen emoji ("Recent"), newest first; hidden while empty. */
  readonly recent = input<readonly EmojiPickerItem[]>([]);
  /** The account's own emoji ("Yours"); hidden while empty. */
  readonly own = input<readonly EmojiPickerItem[]>([]);
  /** Name and placeholder of the search box ("Search emoji"). */
  readonly searchLabel = input.required<string>();
  /** Name of the tab list ("Categories"). */
  readonly categoriesLabel = input.required<string>();
  /** Heading of the recent emoji ("Recent"). */
  readonly recentLabel = input('');
  /** Heading of the own emoji ("Yours"). */
  readonly ownLabel = input('');
  /** Heading of the search results ("Results"). */
  readonly resultsLabel = input('');
  /** Shown (and announced) when the search finds nothing. */
  readonly noResultsLabel = input('');
  /** Name of the spinner while the emoji load. */
  readonly loadingLabel = input('');
  /** The close button of the phone sheet ("Close"); no button without it. */
  readonly closeLabel = input('');
  /** Emits on every open: the moment to load `categories`. */
  readonly opened = output<void>();
  /** An own emoji was removed ("×", Delete or Backspace): the emoji. */
  readonly removed = output<string>();

  private readonly overlays = inject(UiOverlay);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly phone = mediaMatch(PHONE_MEDIA_QUERY);

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly popup = viewChild.required<ElementRef<HTMLElement>>('popup');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  protected readonly panelId = nextFieldId('ui-emoji-picker-panel');
  private readonly ids = nextFieldId('ui-emoji-picker');
  protected readonly open = signal(false);
  /** The popup sits in the overlay pane (open, or still leaving). */
  protected readonly attached = signal(false);
  /** This open is the phone sheet. */
  protected readonly sheet = signal(false);
  protected readonly query = signal('');
  protected readonly searching = computed(() => this.query().trim() !== '');
  /** The selected tab; kept while it still exists. */
  protected readonly category = linkedSignal<readonly EmojiPickerCategory[], string | undefined>({
    source: this.categories,
    computation: (categories, previous) =>
      categories.some((item) => item.id === previous?.value) ? previous?.value : categories[0]?.id,
  });

  protected readonly results = computed(() =>
    this.section(
      'results',
      this.resultsLabel(),
      searchEmoji(this.categories(), this.query(), this.own()),
    ),
  );

  private overlay: ConnectedOverlay | null = null;
  private overlaySheet = false;
  private detachSubscription: Subscription | null = null;
  private openedByPointer = false;
  private readonly outsidePress = (event: Event): void => {
    const target = event.target;
    if (
      target instanceof Node &&
      !this.host.contains(target) &&
      !this.popup().nativeElement.contains(target)
    ) {
      this.hide(false);
    }
  };

  constructor() {
    super();
    trackInputModality();
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('pointerdown', this.outsidePress, true);
      this.detachSubscription?.unsubscribe();
      this.overlay?.dispose();
      // The pane may still hold the popup element, which Angular no longer owns.
      this.popup().nativeElement.remove();
    });
  }

  /** Focuses the field (Signal Forms calls this for the first invalid field). */
  focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }

  /** The sections above and in a category tab: "Recent", "Yours", then the category. */
  protected sections(category: EmojiPickerCategory): EmojiPickerSection[] {
    return [
      this.section(`${category.id}-recent`, this.recentLabel(), this.recent()),
      this.section(`${category.id}-own`, this.ownLabel(), this.own(), true),
      this.section(category.id, category.label, category.items),
    ].filter((section) => section.rows.length > 0);
  }

  private section(
    key: string,
    label: string,
    items: readonly EmojiPickerItem[],
    removable = false,
  ): EmojiPickerSection {
    return {
      headingId: `${this.ids}-${key}`,
      label,
      rows: emojiRows(items, EMOJI_PICKER_COLUMNS),
      removable,
    };
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onFieldClick(): void {
    if (this.open()) {
      this.hide(true);
    } else {
      this.show(true);
    }
  }

  protected onFieldKeydown(event: KeyboardEvent): void {
    if (
      !this.open() &&
      (event.key === KEYBOARD_KEY.Enter || event.key === KEYBOARD_KEY.ArrowDown) &&
      !event.isComposing
    ) {
      // Enter must not submit the surrounding form: it opens the panel.
      event.preventDefault();
      this.show(false);
    }
  }

  protected onFieldBlur(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!this.open() && !(next instanceof Node && this.popup().nativeElement.contains(next))) {
      this.touch.emit();
    }
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    afterNextRender(() => this.overlay?.updatePosition(), { injector: this.injector });
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.ArrowDown) {
      event.preventDefault();
      this.body()
        ?.nativeElement.querySelector<HTMLElement>('[role="gridcell"][tabindex="0"]')
        ?.focus();
    } else if (event.key === KEYBOARD_KEY.Enter) {
      // Enter in the box chooses the first result and never submits the form.
      event.preventDefault();
      const first = this.results().rows[0]?.[0];
      if (this.searching() && first) {
        this.choose(first.emoji);
      }
    }
  }

  /** Esc closes; Tab past the last stop (or Shift+Tab before the first) leaves through the field. */
  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.Escape) {
      event.preventDefault();
      // A dialog around the picker keeps its own Esc.
      event.stopPropagation();
      this.hide(true);
      return;
    }
    const cell =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLElement>('[data-emoji]')
        : null;
    if (cell) {
      this.onCellKeydown(event, cell);
    }
    if (event.key !== KEYBOARD_KEY.Tab) {
      return;
    }
    const stops = [
      ...(this.panel()?.nativeElement.querySelectorAll<HTMLElement>(PANEL_STOPS) ?? []),
    ].filter((element) => !element.closest('[inert]'));
    const edge = event.shiftKey ? stops[0] : stops[stops.length - 1];
    if (event.target === edge || stops.length === 0) {
      // Forward Tab moves on from the field (the browser's default runs after this handler);
      // Shift+Tab lands on the field itself.
      if (event.shiftKey) {
        event.preventDefault();
      }
      this.hide(true);
    }
  }

  protected onPanelFocusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (
      next instanceof Node &&
      !this.popup().nativeElement.contains(next) &&
      next !== this.field().nativeElement
    ) {
      this.hide(false);
    }
  }

  /** Enter or Space chooses the focused cell; Delete or Backspace removes an own emoji. */
  private onCellKeydown(event: KeyboardEvent, cell: HTMLElement): void {
    const emoji = cell.dataset['emoji'] ?? '';
    if (event.key === KEYBOARD_KEY.Enter || event.key === KEYBOARD_KEY.Space) {
      event.preventDefault();
      this.choose(emoji);
    } else if (
      (event.key === KEYBOARD_KEY.Delete || event.key === KEYBOARD_KEY.Backspace) &&
      cell.closest('[data-own="true"]') &&
      this.own().some((item) => item.emoji === emoji && item.removeLabel)
    ) {
      event.preventDefault();
      this.remove(emoji);
    }
  }

  /** The "×" of an own emoji (pointer and touch only). */
  protected onRemoveClick(event: Event, emoji: string): void {
    event.stopPropagation();
    this.remove(emoji);
  }

  protected choose(emoji: string): void {
    this.value.set(emoji);
    this.hide(true);
  }

  /** Emits, then keeps focus in "Yours": on the emoji that took the place of the removed one. */
  private remove(emoji: string): void {
    const index = this.own().findIndex((item) => item.emoji === emoji);
    this.removed.emit(emoji);
    afterNextRender(
      () => {
        const cells = [
          ...(this.body()?.nativeElement.querySelectorAll<HTMLElement>(
            '[data-own="true"] [role="gridcell"]',
          ) ?? []),
        ];
        const next = cells[Math.min(index, cells.length - 1)];
        (next ?? this.panel()?.nativeElement.querySelector<HTMLElement>('input'))?.focus();
      },
      { injector: this.injector },
    );
  }

  private show(pointer: boolean): void {
    if (this.open() || this.disabled()) {
      return;
    }
    this.openedByPointer = pointer || lastInputWasPointer();
    this.query.set('');
    const sheet = this.phone();
    this.sheet.set(sheet);
    this.open.set(true);
    if (this.overlay?.isAttached && this.overlaySheet === sheet) {
      // Reopened while the leave animation runs.
      this.overlay.cancelRelease();
    } else {
      this.createOverlay(sheet);
    }
    this.attached.set(true);
    this.document.addEventListener('pointerdown', this.outsidePress, true);
    this.opened.emit();
    afterNextRender(
      () => {
        this.overlay?.updatePosition();
        // On a phone the keyboard would cover the sheet: focus the panel, not the search box.
        const panel = this.panel()?.nativeElement;
        (sheet ? panel : panel?.querySelector<HTMLElement>('input'))?.focus({
          preventScroll: true,
        });
      },
      { injector: this.injector },
    );
  }

  private createOverlay(sheet: boolean): void {
    this.detachSubscription?.unsubscribe();
    this.overlay?.dispose();
    const overlay = sheet
      ? this.overlays.global(
          { edge: OVERLAY_EDGE.Bottom, layer: OVERLAY_LAYER.Menu },
          { injector: this.injector },
        )
      : this.overlays.connect(
          {
            origin: this.host.querySelector<HTMLElement>('.ui-field__control') ?? this.host,
            positions: menuPositions(MENU_ALIGN.Start),
            layer: OVERLAY_LAYER.Menu,
          },
          { injector: this.injector },
        );
    this.overlay = overlay;
    this.overlaySheet = sheet;
    overlay.attachElement(this.popup().nativeElement);
    this.detachSubscription = overlay.detachments().subscribe(() => {
      if (this.overlay === overlay) {
        this.attached.set(false);
        this.open.set(false);
      }
    });
  }

  /** Closes; `restoreFocus` hands focus back to the field (no ring after a pointer, no tooltip). */
  protected hide(restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.document.removeEventListener('pointerdown', this.outsidePress, true);
    if (restoreFocus) {
      returnFocus(this.field().nativeElement, this.openedByPointer);
    }
    this.touch.emit();
    // The content leaves in this render (its leave animation starts); release the pane after it.
    afterNextRender(() => this.overlay?.release(), { injector: this.injector });
  }
}
