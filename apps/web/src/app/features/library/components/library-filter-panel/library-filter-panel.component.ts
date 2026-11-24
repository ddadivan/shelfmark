import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SAVED_WITHIN } from '@shelfmark/contracts';
import {
  CHIP_VARIANT,
  ChipComponent,
  PopoverComponent,
  SegmentedControlComponent,
  SwitchComponent,
  type SegmentedOption,
} from '@shelfmark/ui';
import { TagsStore } from '../../../../stores/tags.store';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import { parseSavedWithin } from '../../../links/utils/filter-params';
import { LibraryFilterService } from '../../services/library-filter.service';
import { FILTER_PANEL_KINDS } from './models/filter-panel-kinds.const';
import { FILTER_PANEL_TAGS_MAX } from './models/filter-panel-tags-max.const';
import { SAVED_ANY } from './models/saved-any.const';

/**
 * The library's Filter popover (Shelf `designs/01-library.html`, "Filter…" in the ⋯ menu): Type
 * (one kind at a time), Saved (any time, past week, past month), Tags (the most used, AND) and
 * Only favorites. Every choice changes the URL at once, so the feed, the filter chips above it and
 * Back follow; the page's `LibraryFilterService` owns the state.
 */
@Component({
  selector: 'app-library-filter-panel',
  imports: [
    TranslocoPipe,
    ChipComponent,
    PopoverComponent,
    SegmentedControlComponent,
    SwitchComponent,
  ],
  templateUrl: './library-filter-panel.component.html',
  styleUrl: './library-filter-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryFilterPanelComponent {
  protected readonly filters = inject(LibraryFilterService);
  private readonly tags = inject(TagsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly popover = viewChild.required(PopoverComponent);
  /** Ticks when the active language or its translations change. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly kinds = FILTER_PANEL_KINDS;
  protected readonly favoritesFeed = computed(() => this.filters.scope() === LINKS_SCOPE.Favorites);
  protected readonly savedValue = computed(() => this.filters.saved() ?? SAVED_ANY);
  protected readonly savedOptions = computed<SegmentedOption[]>(() => {
    this.i18n();
    const t = (key: string) => this.transloco.translate(`library.filterPanel.saved.${key}`);
    return [
      { value: SAVED_ANY, label: t(SAVED_ANY) },
      { value: SAVED_WITHIN.Week, label: t(SAVED_WITHIN.Week) },
      { value: SAVED_WITHIN.Month, label: t(SAVED_WITHIN.Month) },
    ];
  });
  /** The most used tags, plus any tag of the filter that is not among them. */
  protected readonly tagNames = computed(() => {
    const top = this.tags
      .entities()
      .slice(0, FILTER_PANEL_TAGS_MAX)
      .map((tag) => tag.name);
    const extra = this.filters
      .tags()
      .filter((name) => !top.some((tag) => tag.toLowerCase() === name.toLowerCase()));
    return [...top, ...extra];
  });

  /** Opens the popover under `anchor` (the ⋯ button) with focus inside. */
  open(anchor: HTMLElement): void {
    void this.tags.load();
    this.popover().openFrom(anchor, { focus: true });
  }

  protected tagOn(name: string): boolean {
    return this.filters.tags().some((tag) => tag.toLowerCase() === name.toLowerCase());
  }

  protected chooseSaved(value: string): void {
    void this.filters.setSaved(parseSavedWithin(value));
  }
}
