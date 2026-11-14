import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FoldersStore } from '../../../stores/folders.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import type { UiView } from '../../../stores/models/ui-view.type';
import { exportScopeOf } from '../../export/utils/export-url';
import { FEED_SORT } from '../../links/models/feed-sort.const';
import type { FeedSort } from '../../links/models/feed-sort.type';
import { KIND_QUERY_PARAM } from '../../links/models/kind-query-param.const';
import type { AddLinkData } from '../../links/models/add-link-data.interface';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { SEARCH_QUERY_PARAM } from '../../links/models/search-query-param.const';
import { SORT_QUERY_PARAM } from '../../links/models/sort-query-param.const';
import { sameFilter } from '../../links/utils/links-filter';
import { explicitFeedSort, feedSortQuery } from '../../links/utils/feed-sort';
import { parseLinkKind } from '../../links/utils/link-kind';
import { parseSearchQuery } from '../../links/utils/search-query';
import { TAG_QUERY_PARAM } from '../../tags/models/tag-query-param.const';
import { parseTagFilter } from '../../tags/utils/tag-filter';
import { sameViewQuery } from '../../views/utils/saved-view-query';
import { APP_PATH } from '../../../models/app-path.const';
import { EMPTY_ILLUSTRATIONS } from '../models/empty-illustrations.const';
import { EMPTY_KEYS } from '../models/empty-keys.const';
import { FILTERED_EMPTY_KEY } from '../models/filtered-empty-key.const';
import type { LibraryRouteInputs } from '../models/library-route-inputs.interface';
import { FeedMemoryService } from './feed-memory.service';

const NO_INPUTS: LibraryRouteInputs = {
  scope: signal(LINKS_SCOPE.All),
  folderId: signal(undefined),
  tag: signal(undefined),
  q: signal(undefined),
  sort: signal(undefined),
  kind: signal(undefined),
};

/**
 * What the library page shows, read from its route (scope, folder) and query (`?tag`, `?q`,
 * `?sort`, `?kind`): the filter of the links store, the view and sort the feed remembers, the
 * folder of the page, and the query-param changes of the filter chips and sort menu.
 * Page-scoped: the page provides it and hands over its inputs with `connect`.
 */
@Service({ autoProvided: false })
export class LibraryFilterService {
  private readonly settings = inject(UserSettingsStore);
  private readonly memory = inject(FeedMemoryService);
  private readonly folders = inject(FoldersStore);
  private readonly views = inject(SavedViewsStore);
  private readonly router = inject(Router);
  private readonly inputs = signal<LibraryRouteInputs>(NO_INPUTS);

  /**
   * Binds the route inputs of the page (call once, in its constructor). Until then every signal
   * reads `NO_INPUTS`, so consumers read these signals lazily (in a `computed` or `effect`), never
   * in their own constructor.
   */
  connect(inputs: LibraryRouteInputs): void {
    this.inputs.set(inputs);
  }

  readonly scope = computed(() => this.inputs().scope());
  readonly folderId = computed(() => this.inputs().folderId());
  /** The tags of the filter: normalized, deduplicated, at most `LINK_LIMIT.TagFilterMax`. */
  readonly tags = computed(() => parseTagFilter(this.inputs().tag()));
  /** The search text: normalized; empty for no search. */
  readonly query = computed(() => parseSearchQuery(this.inputs().q()));
  readonly isFolder = computed(() => this.scope() === LINKS_SCOPE.Folder);
  /** What the feed remembers its view and sort by: the folder, or the fixed list. */
  readonly feedKey = computed(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? `folder:${id}` : this.scope();
  });
  /** `?sort=` when it names one, else the feed's own last choice, else the account's default. */
  readonly feedSort = computed<FeedSort>(
    () =>
      explicitFeedSort(this.inputs().sort()) ??
      this.memory.sort(this.feedKey()) ??
      this.settings.libraryShown().defaultSort,
  );
  /** The feed's own last view, else the account's Default view. */
  readonly view = computed<UiView>(
    () => this.memory.view(this.feedKey()) ?? this.settings.libraryShown().defaultView,
  );
  /** `?split` as the URL has it (`undefined` when absent): read by `SplitViewService`. */
  readonly splitParam = computed(() => this.inputs().split?.());
  readonly linkKind = computed(() => parseLinkKind(this.inputs().kind()));
  readonly searching = computed(() => this.query() !== '');
  readonly filtered = computed(
    () => this.tags().length > 0 || this.searching() || this.linkKind() !== undefined,
  );

  /** The folder of the page, once the folder list has it. */
  readonly folder = computed(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? this.folders.entityMap()[id] : undefined;
  });
  /** An unknown or foreign folder id: the page shows "not found" instead of the content. */
  readonly folderMissing = computed(
    () =>
      this.isFolder() &&
      (this.folderId() === undefined || (this.folders.loaded() && this.folder() === undefined)),
  );
  /** Data of the add-link dialog: the folder of the page is preselected. */
  readonly addLinkData = computed<AddLinkData>(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? { folderId: id } : {};
  });
  readonly titleKey = computed(() => `library.scope.${this.scope()}`);
  readonly emptyKey = computed(() =>
    this.isFolder() ? 'library.emptyFolder' : EMPTY_KEYS[this.scope()],
  );
  /** Scene of the empty feed: one per scope (#315). */
  readonly emptyIllustration = computed(() => EMPTY_ILLUSTRATIONS[this.scope()]);
  /** The saved view whose filters the page shows, if any (its empty state names it). */
  readonly activeView = computed(() => {
    const filter = this.filter();
    return this.views.items().find((view) => sameViewQuery(view.query, filter));
  });
  /** Empty state of a filtered feed: a saved view, tags only, or other filters. */
  readonly filteredEmptyKey = computed(() => {
    if (this.activeView()) {
      return FILTERED_EMPTY_KEY.View;
    }
    return this.linkKind() === undefined ? FILTERED_EMPTY_KEY.Tags : FILTERED_EMPTY_KEY.Filters;
  });
  /** Favorites cannot be filled by adding a link, so its empty state points back to all links. */
  readonly canAddLink = computed(() => this.scope() !== LINKS_SCOPE.Favorites);
  /**
   * The filter of the links store. Equal filters (the same request) keep the same object, so a
   * query parameter that is no filter (`?split`) refetches nothing and keeps the selection.
   */
  readonly filter = computed<LinksFilter>(
    () => {
      const scope = this.scope();
      const folderId = this.folderId();
      const tags = this.tags();
      const q = this.query();
      const sort = this.feedSort();
      const kind = this.linkKind();
      const options = {
        ...(tags.length > 0 ? { tags } : {}),
        ...(q === '' ? {} : { q }),
        ...(kind === undefined ? {} : { kind }),
        ...(sort === FEED_SORT.Newest ? {} : feedSortQuery(sort)),
      };
      if (scope !== LINKS_SCOPE.Folder) {
        return { scope, ...options };
      }
      // A folder page without an id cannot happen through the router; it shows "not found".
      return folderId === undefined
        ? { scope: LINKS_SCOPE.All, ...options }
        : { scope, folderId, ...options };
    },
    { equal: sameFilter },
  );
  /** What "This view" exports; `undefined` when the view has no export equivalent. */
  readonly viewScope = computed(() => exportScopeOf(this.filter()));

  /** Takes one tag out of the filter. */
  async removeTag(name: string): Promise<void> {
    const rest = this.tags().filter((tag) => tag !== name);
    await this.setTags(rest);
  }

  /** Takes the search out of the filter. */
  async clearSearch(): Promise<void> {
    await this.setQueryParams({ [SEARCH_QUERY_PARAM]: null });
  }

  /** Clears everything the filter holds: the search, the tags and the kind. */
  async clearAll(): Promise<void> {
    await this.setQueryParams({
      [SEARCH_QUERY_PARAM]: null,
      [TAG_QUERY_PARAM]: null,
      [KIND_QUERY_PARAM]: null,
    });
  }

  /** Takes the kind out of the filter. */
  async clearKind(): Promise<void> {
    await this.setQueryParams({ [KIND_QUERY_PARAM]: null });
  }

  /** The empty filtered state: drops the tags and the kind (the search has its own state). */
  async clearFilters(): Promise<void> {
    await this.setQueryParams({ [TAG_QUERY_PARAM]: null, [KIND_QUERY_PARAM]: null });
  }

  /** Repeats the search in all folders (the "all links" page keeps the query and sort, drops the tags). */
  async searchEverywhere(): Promise<void> {
    await this.router.navigate(['/', APP_PATH.Links], {
      queryParams: {
        [SEARCH_QUERY_PARAM]: this.query(),
        [SORT_QUERY_PARAM]: this.sortParam(this.feedSort()),
      },
    });
  }

  /** Remembers the sort for this feed; the URL names it only when it differs from the default. */
  async setSort(sort: FeedSort): Promise<void> {
    this.memory.remember(this.feedKey(), { sort });
    await this.setQueryParams({ [SORT_QUERY_PARAM]: this.sortParam(sort) });
  }

  /** Remembers the view (cards or list) for this feed. */
  rememberView(view: UiView, feed: string = this.feedKey()): void {
    this.memory.remember(feed, { view });
  }

  /** `?sort=` for a sort: left out for the account's default (the URL stays short). */
  private sortParam(sort: FeedSort): FeedSort | null {
    return sort === this.settings.libraryShown().defaultSort ? null : sort;
  }

  private async setQueryParams(params: Record<string, unknown>): Promise<void> {
    await this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }

  private async setTags(tags: readonly string[]): Promise<void> {
    await this.setQueryParams({ [TAG_QUERY_PARAM]: tags.length > 0 ? tags : null });
  }
}
