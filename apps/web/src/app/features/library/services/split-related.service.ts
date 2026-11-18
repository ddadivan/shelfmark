import { computed, inject, Injector, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AI_SEARCH_STATE } from '@shelfmark/contracts';
import { catchError, of, switchMap, timer } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { AI_API } from '../../ai/models/ai-api.const';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { RELATED_REFRESH_DELAY_MS } from '../models/related-refresh-delay-ms.const';
import { SPLIT_RELATED_LIMIT } from '../models/split-related-limit.const';
import { relatedFolderIds } from '../utils/related-folder-ids';
import { LibraryFilterService } from './library-filter.service';
import { SplitViewService } from './split-view.service';

/**
 * "Show related" in side by side (AI-3): while the right half shows its picker and `?related`
 * names a link, the folders of up to `SPLIT_RELATED_LIMIT` related links (best first, Unsorted as
 * `null`) take the place of the picker's "Recent" group, as "Related folders". Nothing changes while
 * search by meaning is not ready, the link has no related links or the request fails. When the
 * related link's title, note, tags or summary change (an Edit link save), it asks again after
 * `RELATED_REFRESH_DELAY_MS`, once the vector was rebuilt. Page-scoped: the page provides it (`provideLibraryPage()`).
 */
@Service({ autoProvided: false })
export class SplitRelatedService {
  private readonly filters = inject(LibraryFilterService);
  private readonly split = inject(SplitViewService);
  private readonly folders = inject(FoldersStore);
  private readonly links = inject(LinksStore);
  private readonly ai = inject(AiSettingsStore);
  // Read when asked only: a library page without AI never needs the AI seam.
  private readonly injector = inject(Injector);

  /** "Show related" may be offered: search by meaning is ready and the split can open. */
  readonly available = computed(() => this.ai.meaningReady() && this.split.canOpen());

  private readonly linkId = computed(() => {
    const id = this.filters.relatedParam();
    return typeof id === 'string' &&
      id !== '' &&
      this.ai.meaningReady() &&
      this.split.open() &&
      this.split.rightTarget() === undefined
      ? id
      : undefined;
  });

  /** What the related link's vector is built from, as far as the loaded list knows it. */
  private readonly embedded = computed(() => {
    const id = this.linkId();
    const link = id === undefined ? undefined : this.links.entityMap()[id];
    return link === undefined
      ? ''
      : JSON.stringify([
          link.title,
          link.note,
          link.summary,
          [...link.tags].sort((a, b) => a.localeCompare(b, 'en')),
        ]);
  });

  private lastAsked: { id: string; embedded: string } | null = null;

  private readonly related = rxResource({
    params: () => {
      const id = this.linkId();
      return id === undefined ? undefined : { id, embedded: this.embedded() };
    },
    stream: ({ params }) => {
      const refresh =
        this.lastAsked?.id === params.id && this.lastAsked.embedded !== params.embedded;
      this.lastAsked = params;
      const ask = () => this.injector.get(AI_API).related(params.id, SPLIT_RELATED_LIMIT);
      return (refresh ? timer(RELATED_REFRESH_DELAY_MS).pipe(switchMap(ask)) : ask()).pipe(
        catchError(() => of(null)),
      );
    },
  });

  /** The related folders, best first; empty while there are none. */
  readonly folderIds = computed<(string | null)[]>(() => {
    const response = this.related.hasValue() ? this.related.value() : null;
    if (
      this.linkId() === undefined ||
      response === null ||
      response.status.state !== AI_SEARCH_STATE.Ready
    ) {
      return [];
    }
    const known = this.folders.entityMap();
    return relatedFolderIds(response.items, (id) => known[id] !== undefined);
  });

  /** The ids of the picker's first group: the related folders, else the recent ones. */
  readonly pickerIds = computed<readonly (string | null)[]>(() =>
    this.folderIds().length > 0 ? this.folderIds() : this.split.rightRecent(),
  );
  /** Key of that group's label. */
  readonly pickerLabelKey = computed(() =>
    this.folderIds().length > 0 ? 'ai.related.folders' : 'links.move.recent',
  );
}
