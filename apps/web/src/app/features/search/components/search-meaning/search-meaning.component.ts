import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AiLineComponent,
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
} from '@shelfmark/ui';
import { LinksStore } from '../../../../stores/links.store';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { LibraryFilterService } from '../../../library/services/library-filter.service';
import { LinkPreviewService } from '../../../link-preview/services/link-preview.service';
import { LinkCardComponent } from '../../../links/components/link-card/link-card.component';
import { LINKS_SCOPE } from '../../../links/models/links-scope.const';
import { FolderChipsService } from '../../../links/services/folder-chips.service';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { CARD_FIELD } from '../../../library/models/card-field.const';
import type { SearchState } from '../../models/search-state.interface';
import { MeaningSearch } from '../../services/meaning-search';
import { SearchAskService } from '../../services/search-ask.service';

/**
 * The search part of the library feed that the word results do not cover (Shelf `03-search.html`),
 * inside the library page (it reads the page's `LibraryFilterService` and `LinkPreviewService`):
 * "Close in meaning · N", the meaning matches of the search (AI-3, `MeaningSearch`, asked once the
 * feed's word answer for the text has settled) as cards under the word results; with `empty` (no
 * word match) it is the whole answer: the meaning cards under "No links with these words", or the
 * "Nothing found" state with Clear search, Ask your shelf (while Ask is on) and, outside All links,
 * Search all folders.
 */
@Component({
  selector: 'app-search-meaning',
  imports: [
    TranslocoPipe,
    AiLineComponent,
    ButtonComponent,
    EmptyStateComponent,
    IconComponent,
    LinkCardComponent,
  ],
  providers: [MeaningSearch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-meaning.component.html',
  styleUrl: './search-meaning.component.scss',
})
export class SearchMeaningComponent {
  /** The word results are empty: this is the whole answer of the search. */
  readonly empty = input(false);

  protected readonly filters = inject(LibraryFilterService);
  protected readonly actions = inject(LinkActionsService);
  protected readonly preview = inject(LinkPreviewService);
  protected readonly folderChips = inject(FolderChipsService);
  protected readonly ai = inject(AiSettingsStore);
  protected readonly meaning = inject(MeaningSearch);
  protected readonly CARD_FIELD = CARD_FIELD;
  private readonly store = inject(LinksStore);
  private readonly asker = inject(SearchAskService);

  /** The word answer of the feed, once it is for the text in the URL. */
  private readonly words = computed<SearchState>(() => {
    const query = this.filters.query();
    const settled = !this.store.loading() && (this.store.filter().q ?? '') === query;
    return {
      query: settled ? query : '',
      links: settled ? this.store.entities() : [],
      more: false,
      failed: false,
    };
  });
  /** "Search all folders" is offered outside All links. */
  protected readonly elsewhere = computed(() => this.filters.scope() !== LINKS_SCOPE.All);

  constructor() {
    this.meaning.connect({ text: this.filters.query, words: this.words });
  }

  protected async ask(): Promise<void> {
    await this.asker.ask(this.filters.query());
  }
}
