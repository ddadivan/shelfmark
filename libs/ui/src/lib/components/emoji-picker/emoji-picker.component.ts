import { Grid, GridCell, GridRow } from '@angular/aria/grid';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { UiFieldControl } from '../field/field-control.directive';
import { FieldShellComponent } from '../field/field-shell.component';
import { nextFieldId } from '../field/field-ids';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { SpinnerComponent } from '../spinner/spinner.component';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { KEYBOARD_KEY } from '../../models/keyboard';
import { emojiCellAction, firstGridStop, focusAfterRemoval, opensPanel } from './emoji-picker-keys';
import { EmojiPickerOverlay } from './emoji-picker-overlay';
import { categorySections, keptCategory, resultsSection } from './emoji-sections';
import type { EmojiPickerCategory } from './models/emoji-picker-category.interface';
import type { EmojiPickerItem } from './models/emoji-picker-item.interface';
import type { EmojiPickerSection } from './models/emoji-picker-section.interface';

/**
 * Picks one emoji (the folder icon, #363): a text field (typing or pasting still works) that opens
 * a panel with search, Angular Aria category tabs and emoji grids; "Recent" and "Yours" on top,
 * own emoji removable (`removed`). Names come in translated; the feature loads them on `opened`.
 * Open / close, focus and the sheet drag are `EmojiPickerOverlay`; sections are `emoji-sections`;
 * cell keys are `emoji-picker-keys`. The full behaviour is in libs/ui CLAUDE.md (Emoji picker).
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
    './emoji-picker-sheet.scss',
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

  private readonly injector = inject(Injector);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly popup = viewChild.required<ElementRef<HTMLElement>>('popup');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  /** Open / close, focus and the phone sheet drag. */
  protected readonly overlay = new EmojiPickerOverlay({
    element: inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
    field: () => this.field().nativeElement,
    popup: () => this.popup().nativeElement,
    panel: () => this.panel()?.nativeElement,
    onClosed: () => this.touch.emit(),
  });
  protected readonly panelId = nextFieldId('ui-emoji-picker-panel');
  private readonly ids = nextFieldId('ui-emoji-picker');
  protected readonly query = signal('');
  protected readonly searching = computed(() => this.query().trim() !== '');
  /** The selected tab; kept while it still exists. */
  protected readonly category = linkedSignal<readonly EmojiPickerCategory[], string | undefined>({
    source: this.categories,
    computation: (categories, previous) => keptCategory(categories, previous?.value),
  });
  protected readonly results = computed(() =>
    resultsSection(this.ids, this.resultsLabel(), this.categories(), this.query(), this.own()),
  );

  constructor() {
    super();
    // The panel's height changes when the names arrive, a search runs or own emoji go: place it
    // again, so it flips above the field when there is no longer room below.
    afterRenderEffect(() => {
      this.categories();
      this.results();
      this.recent();
      this.own();
      this.overlay.updatePosition();
    });
  }

  /** Focuses the field (Signal Forms calls this for the first invalid field). */
  focus(options?: FocusOptions): void {
    this.field().nativeElement.focus(options);
  }

  /** The sections of a category tab: "Recent", "Yours", then the category. */
  protected sections(category: EmojiPickerCategory): EmojiPickerSection[] {
    return categorySections(
      this.ids,
      category,
      { label: this.recentLabel(), items: this.recent() },
      { label: this.ownLabel(), items: this.own() },
    );
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onFieldClick(): void {
    if (this.overlay.open()) {
      this.overlay.hide(true);
    } else {
      this.show(true);
    }
  }

  protected onFieldKeydown(event: KeyboardEvent): void {
    if (!this.overlay.open() && opensPanel(event)) {
      // Enter must not submit the surrounding form: it opens the panel.
      event.preventDefault();
      this.show(false);
    }
  }

  protected onFieldBlur(event: FocusEvent): void {
    if (this.overlay.isFieldBlur(event)) {
      this.touch.emit();
    }
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === KEYBOARD_KEY.ArrowDown) {
      event.preventDefault();
      firstGridStop(this.body()?.nativeElement)?.focus();
    } else if (event.key === KEYBOARD_KEY.Enter) {
      // Enter in the box chooses the first result and never submits the form.
      event.preventDefault();
      const first = this.results().rows[0]?.[0];
      if (this.searching() && first) {
        this.choose(first.emoji);
      }
    }
  }

  /** Esc and Tab are the overlay's; on a cell, Enter / Space choose and Delete removes. */
  protected onPanelKeydown(event: KeyboardEvent): void {
    if (this.overlay.keydown(event) || !(event.target instanceof HTMLElement)) {
      return;
    }
    const cell = event.target.closest<HTMLElement>('[data-emoji]');
    const action = cell ? emojiCellAction(event.key, cell, this.own()) : null;
    if (action?.kind === 'choose') {
      event.preventDefault();
      this.choose(action.emoji);
    } else if (action?.kind === 'remove') {
      event.preventDefault();
      this.remove(action.emoji);
    }
  }

  /** The "×" of an own emoji (pointer and touch only). */
  protected onRemoveClick(event: Event, emoji: string): void {
    event.stopPropagation();
    this.remove(emoji);
  }

  protected choose(emoji: string): void {
    this.value.set(emoji);
    this.overlay.hide(true);
  }

  /** Emits, then keeps focus in "Yours": on the emoji that took the place of the removed one. */
  private remove(emoji: string): void {
    const index = this.own().findIndex((item) => item.emoji === emoji);
    this.removed.emit(emoji);
    afterNextRender(() => focusAfterRemoval(this.panel()?.nativeElement, index), {
      injector: this.injector,
    });
  }

  private show(pointer: boolean): void {
    if (this.overlay.open() || this.disabled()) {
      return;
    }
    this.query.set('');
    this.overlay.show(pointer);
    this.opened.emit();
  }
}
