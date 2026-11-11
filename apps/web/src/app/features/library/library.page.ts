import { CdkDrag, type CdkDragMove, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { combineLatest, map, switchMap } from 'rxjs';
import {
  BreadcrumbsComponent,
  ButtonComponent,
  ChipComponent,
  EmptyStateComponent,
  ICON_SIZE,
  loaderVisible,
  LoadMoreComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  NoticeComponent,
  ProgressBarComponent,
  SegmentedControlComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type BreadcrumbClick,
  type BreadcrumbItem,
  type SegmentedOption,
} from '@shelfmark/ui';
import { EXPORT_FORMAT, type ExportFormat, type LinkResponse } from '@shelfmark/contracts';
import { Router } from '@angular/router';
import { pluralKey } from '../../core/i18n/plural-key';
import { ViewportService } from '../../core/layout/viewport.service';
import { ExportActionsService } from '../export/export-actions.service';
import { exportScopeOf } from '../export/export-url';
import { TAG_QUERY_PARAM } from '../tags/models/tag-query-param.const';
import { parseTagFilter } from '../tags/tag-filter';
import { feedSortQuery, parseFeedSort } from '../links/feed-sort';
import { FEED_SORT } from '../links/models/feed-sort.const';
import type { FeedSort } from '../links/models/feed-sort.type';
import { SEARCH_QUERY_PARAM } from '../links/models/search-query-param.const';
import { SORT_QUERY_PARAM } from '../links/models/sort-query-param.const';
import { sameFilter } from '../links/links-filter';
import { parseSearchQuery } from '../links/search-query';
import { InViewDirective } from '../links/in-view/in-view.directive';
import { LinkActionsService } from '../links/link-actions.service';
import { LinkDragService } from '../links/drag/link-drag.service';
import { HowItWorksService } from '../how-it-works/how-it-works.service';
import { LinkCardComponent } from '../links/link-card/link-card.component';
import { LinkRowComponent } from '../links/link-row/link-row.component';
import type { AddLinkData } from '../links/models/add-link-data.interface';
import type { LinksFilter } from '../links/models/links-filter.type';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { APP_PATH } from '../../models/app-path.const';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { isUiView } from '../../stores/is-ui-view';
import { UiStore } from '../../stores/ui.store';
import { EMPTY_KEYS } from './models/empty-keys.const';
import { FolderTileComponent } from './folder-tile/folder-tile.component';
import { runViewTransition, type ViewTransitionNames } from './view-transition';
import { scrollFeedForKey } from './feed-keyboard-scroll';
import type { SubfolderItem } from './models/subfolder-item.interface';
import { SORT_OPTION_KEYS } from './models/sort-option-keys.const';
import { SORT_OPTIONS } from './models/sort-options.const';
import { VIEW_OPTION_KEYS } from './models/view-option-keys.const';

/** Number of placeholders shown while the first page loads. */
const SKELETON_COUNT = 8;

interface LastShown {
  items: readonly LinkResponse[];
  hasMore: boolean;
}

/**
 * The links feed of one scope (all, unsorted, favorites; the route data sets `scope`): a toolbar
 * with the count and the cards / list switch, then the links, with a skeleton on first load,
 * a progress bar on refetch and error and empty states.
 */
@Component({
  selector: 'app-library-page',
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDropList,
    TranslocoPipe,
    BreadcrumbsComponent,
    ButtonComponent,
    ChipComponent,
    EmptyStateComponent,
    FolderTileComponent,
    InViewDirective,
    LinkCardComponent,
    LinkRowComponent,
    LoadMoreComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    NoticeComponent,
    ProgressBarComponent,
    SegmentedControlComponent,
    SkeletonComponent,
  ],
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export default class LibraryPage {
  protected readonly store = inject(LinksStore);
  protected readonly ui = inject(UiStore);
  protected readonly actions = inject(LinkActionsService);
  protected readonly howItWorks = inject(HowItWorksService);
  protected readonly phone = inject(ViewportService).phone;
  protected readonly drag = inject(LinkDragService);
  /** Touch holds 150 ms before a drag starts (DragDrop spec), so a swipe still scrolls. */
  protected readonly DRAG_START_DELAY = { touch: 150, mouse: 0 };
  private readonly exporter = inject(ExportActionsService);
  private readonly folders = inject(FoldersStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly title = inject(Title);
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** From the route data. */
  readonly scope = input<LinksScope>(LINKS_SCOPE.All);
  /** From the route (`folders/:folderId`). */
  readonly folderId = input<string>();
  /** From the query (`?tag=a&tag=b`): one value or a list; see `parseTagFilter`. */
  readonly tag = input<string | readonly string[]>();
  /** From the query (`?q=signal store`): the search text; see `parseSearchQuery`. */
  readonly q = input<unknown>();
  /** From the query (`?sort=oldest`): see `parseFeedSort`. */
  readonly sort = input<unknown>();

  protected readonly UI_VIEW = UI_VIEW;
  protected readonly EXPORT_FORMAT = EXPORT_FORMAT;
  protected readonly LINKS_SCOPE = LINKS_SCOPE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly pluralKey = pluralKey;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  protected readonly SORT_OPTIONS = SORT_OPTIONS;
  protected readonly SORT_OPTION_KEYS = SORT_OPTION_KEYS;

  /** The tags of the filter: normalized, deduplicated, at most `LINK_LIMIT.TagFilterMax`. */
  protected readonly tags = computed(() => parseTagFilter(this.tag()));
  /** The search text: normalized; empty for no search. */
  protected readonly query = computed(() => parseSearchQuery(this.q()));
  protected readonly feedSort = computed<FeedSort>(() => parseFeedSort(this.sort()));
  protected readonly searching = computed(() => this.query() !== '');
  protected readonly filtered = computed(() => this.tags().length > 0 || this.searching());

  protected readonly isFolder = computed(() => this.scope() === LINKS_SCOPE.Folder);
  /** The folder of the page, once the folder list has it. */
  protected readonly folder = computed(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? this.folders.entityMap()[id] : undefined;
  });
  /** An unknown or foreign folder id: the page shows "not found" instead of the content. */
  protected readonly folderMissing = computed(
    () =>
      this.isFolder() &&
      (this.folderId() === undefined || (this.folders.loaded() && this.folder() === undefined)),
  );
  /** Data of the add-link dialog: the folder of the page is preselected. */
  protected readonly addLinkData = computed<AddLinkData>(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? { folderId: id } : {};
  });
  protected readonly titleKey = computed(() => `library.scope.${this.scope()}`);
  protected readonly emptyKey = computed(() =>
    this.isFolder() ? 'library.emptyFolder' : EMPTY_KEYS[this.scope()],
  );
  /** Favorites cannot be filled by adding a link, so its empty state points back to all links. */
  protected readonly canAddLink = computed(() => this.scope() !== LINKS_SCOPE.Favorites);
  private readonly filter = computed<LinksFilter>(() => {
    const scope = this.scope();
    const folderId = this.folderId();
    const tags = this.tags();
    const q = this.query();
    const sort = this.feedSort();
    const options = {
      ...(tags.length > 0 ? { tags } : {}),
      ...(q === '' ? {} : { q }),
      ...(sort === FEED_SORT.Newest ? {} : feedSortQuery(sort)),
    };
    if (scope !== LINKS_SCOPE.Folder) {
      return { scope, ...options };
    }
    // A folder page without an id cannot happen through the router; it shows "not found".
    return folderId === undefined
      ? { scope: LINKS_SCOPE.All, ...options }
      : { scope, folderId, ...options };
  });
  /** What "This view" exports; `undefined` when the view has no export equivalent. */
  protected readonly viewScope = computed(() => exportScopeOf(this.filter()));
  /**
   * The store is app-wide: when the page opens (back from another page) it can still hold the
   * links of another view for a moment. Those never show, and never become the "previous view".
   */
  private readonly synced = computed(() => sameFilter(this.store.filter(), this.filter()));
  private readonly ownCount = computed(() => (this.synced() ? this.store.count() : 0));
  private readonly ownError = computed(() => this.synced() && this.store.error());
  private readonly ownLoaded = computed(() => this.synced() && this.store.loaded());
  private readonly ownLinks = computed(() => (this.synced() ? this.store.entities() : []));
  /** The last list that was fully loaded; it stays on screen while the next view loads. */
  private readonly lastShown = signal<LastShown>({ items: [], hasMore: false });
  /**
   * The view changed and its first page is on the way: the store has no links yet, the cards of
   * the previous view stay (inert, no skeleton, no dimming) under the progress bar.
   */
  protected readonly stale = computed(
    () =>
      // Not synced: the route changed, the store has not been told yet (the next effect run).
      (this.store.loading() || !this.synced()) &&
      !this.ownLoaded() &&
      !this.ownError() &&
      this.ownCount() === 0 &&
      this.lastShown().items.length > 0,
  );
  /**
   * Bumped when a new first page arrives: the list is built again (fresh elements, so cards that
   * survive a view switch do not hop to a new place) instead of being patched in place.
   */
  protected readonly batch = signal(0);
  protected readonly batches = computed(() => [this.batch()]);
  /** The new list fades in only when it replaces a skeleton; on a view switch it just swaps. */
  protected readonly reveal = signal(false);
  /**
   * The cards <-> list switch is running: the links carry their `view-transition-name`. Only then,
   * so the names never take part in the router's page transition (cards would fly between pages).
   */
  protected readonly morphing = signal(false);
  protected readonly morphNames: ViewTransitionNames = {
    on: () => this.morphing.set(true),
    off: () => this.morphing.set(false),
  };
  protected readonly shownLinks = computed(() =>
    this.stale() ? this.lastShown().items : this.ownLinks(),
  );
  protected readonly shownCount = computed(() => this.shownLinks().length);
  protected readonly shownHasMore = computed(() =>
    this.stale() ? this.lastShown().hasMore : this.store.hasMore(),
  );
  protected readonly firstLoad = computed(
    () => !this.ownLoaded() && !this.ownError() && this.ownCount() === 0 && !this.stale(),
  );
  /**
   * The skeleton of the first load: nothing shows before 300 ms (a fast response never flashes
   * it) and, once shown, it stays at least 400 ms (Loading spec).
   */
  protected readonly skeletonVisible = loaderVisible(this.firstLoad);
  protected readonly failed = computed(() => this.ownError() && this.ownCount() === 0);
  protected readonly empty = computed(
    () => this.ownLoaded() && !this.store.loading() && this.ownCount() === 0,
  );
  /** The 2px bar: a refetch and a view switch (the old content stays on screen meanwhile). */
  protected readonly refetching = computed(
    () => this.store.loading() && (this.ownLoaded() || this.stale()),
  );
  protected readonly showLinks = computed(() => this.ownCount() > 0 || this.stale());
  /** Sort and view switch: with links, and while the first page loads (so the toolbar keeps its size). */
  protected readonly showControls = computed(() => this.showLinks() || this.firstLoad());

  private readonly labels = toSignal(
    combineLatest([
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.Cards]),
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.List]),
    ]).pipe(map(([cards, list]) => ({ cards, list }))),
  );
  /** Icon-only switch; `null` until the translations are loaded. */
  protected readonly viewOptions = computed<SegmentedOption[] | null>(() => {
    const labels = this.labels();
    return labels
      ? [
          { value: UI_VIEW.Cards, label: labels.cards, icon: 'cards' },
          { value: UI_VIEW.List, label: labels.list, icon: 'list' },
        ]
      : null;
  });

  /** The document title the app started with (the brand), the suffix of every page title. */
  private readonly appName = this.title.getTitle();
  private readonly rootLabel = toSignal(this.transloco.selectTranslate('library.scope.all'));
  private readonly scopeLabel = toSignal(
    toObservable(this.titleKey).pipe(switchMap((key) => this.transloco.selectTranslate(key))),
  );
  /**
   * The direct subfolders of the folder of the page, by name, with the number of folders inside
   * each. Hidden while a search or tag filter is on (they do not filter) and for a missing folder.
   */
  private readonly currentSubfolders = computed<readonly SubfolderItem[]>(() => {
    const id = this.folderId();
    if (!this.isFolder() || id === undefined || this.folderMissing() || this.filtered()) {
      return [];
    }
    const all = this.folders.entities();
    return all
      .filter((folder) => folder.parentId === id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({
        folder,
        childCount: all.filter((child) => child.parentId === folder.id).length,
      }));
  });
  /** The subfolders of the last settled view; they stay with its cards while the next view loads. */
  private readonly lastSubfolders = signal<readonly SubfolderItem[]>([]);
  protected readonly subfolders = computed(() =>
    this.stale() ? this.lastSubfolders() : this.currentSubfolders(),
  );
  /** The heading of the page; `undefined` until translated. */
  private readonly heading = computed(() => this.folder()?.name ?? this.scopeLabel());
  /** The trail of a folder page: "All links", the ancestors (links) and the folder itself. */
  protected readonly crumbs = computed<BreadcrumbItem[] | null>(() => {
    const id = this.folderId();
    const root = this.rootLabel();
    if (!this.isFolder() || id === undefined || root === undefined || !this.folder()) {
      return null;
    }
    const path = this.folders.pathTo(id);
    return [
      { label: root, href: `/${APP_PATH.Links}` },
      ...path.map((folder, index) =>
        index === path.length - 1
          ? { label: folder.name }
          : { label: folder.name, href: `/${APP_PATH.Folders}/${folder.id}` },
      ),
    ];
  });
  /** The tab title: "<heading> · <app>", or "Search: <query> · <app>" while searching. */
  private readonly pageTitle = toSignal(
    toObservable(computed(() => ({ query: this.query(), heading: this.heading() }))).pipe(
      switchMap(({ query, heading }) =>
        query === ''
          ? this.transloco.selectTranslate('library.pageTitle.page', {
              page: heading ?? '',
              app: this.appName,
            })
          : this.transloco.selectTranslate('library.pageTitle.search', {
              query,
              app: this.appName,
            }),
      ),
    ),
  );
  /** The scroll area of the feed (the page itself scrolls on a phone). */
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    // Remember the last settled list (for stale-while-loading), and build the list again when a
    // new first page replaces the old one.
    let wasLoading = false;
    let sawSkeleton = false;
    effect(() => {
      const settled = this.ownLoaded() && !this.store.loading();
      const items = this.store.entities();
      const hasMore = this.store.hasMore();
      const loading = this.store.loading();
      if (this.skeletonVisible()) {
        sawSkeleton = true;
      }
      // Tracked: the folder list changes (rename, create). The folder of the page is read
      // untracked: it changes before the next view starts loading, while `settled` is still true,
      // and the previous view must not take over the subfolders of the next one.
      this.folders.entities();
      untracked(() => {
        if (settled) {
          this.lastShown.set({ items, hasMore });
          this.lastSubfolders.set(this.currentSubfolders());
        }
        if (wasLoading && !loading) {
          this.reveal.set(sawSkeleton);
          sawSkeleton = false;
          this.batch.update((value) => value + 1);
        }
        wasLoading = loading;
        if (settled) {
          sawSkeleton = false;
        }
      });
    });
    // A new view, sort or filter starts at the top of its list (the page scroll is reset by the
    // router; this area is not the page).
    effect(() => {
      this.filter();
      untracked(() => {
        const area = this.scroller()?.nativeElement;
        if (area) {
          area.scrollTop = 0;
        }
      });
    });
    effect(() => {
      const text = this.pageTitle();
      if (text !== undefined && this.heading() !== undefined) {
        this.title.setTitle(text);
      }
    });
    inject(DestroyRef).onDestroy(() => this.title.setTitle(this.appName));
    // The sidebar loads the folders too (the phone has none yet); the call is shared.
    void this.folders.load();
    this.store.setFilter(this.filter);
  }

  /** Page keys with nothing focused scroll the feed area (the page itself does not scroll). */
  /** Hit-tests the folders under the pointer while a link is dragged. */
  protected onDragMoved(event: CdkDragMove<unknown>): void {
    this.drag.move(event.pointerPosition.x, event.pointerPosition.y);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const area = this.scroller()?.nativeElement;
    if (area) {
      scrollFeedForKey(area, event);
    }
  }

  protected async openUnsorted(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Unsorted}`);
  }

  protected async exportView(format: ExportFormat): Promise<void> {
    await this.exporter.download(format, this.viewScope());
  }

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }

  protected async showAll(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Links}`);
  }

  /** Takes one tag out of the filter. */
  protected async removeTag(name: string): Promise<void> {
    const rest = this.tags().filter((tag) => tag !== name);
    await this.setTags(rest);
  }

  protected async clearTags(): Promise<void> {
    await this.setTags([]);
  }

  /** Takes the search out of the filter. */
  protected async clearSearch(): Promise<void> {
    await this.setQueryParams({ [SEARCH_QUERY_PARAM]: null });
  }

  /** Clears everything the filter holds: the search and the tags. */
  protected async clearAll(): Promise<void> {
    await this.setQueryParams({ [SEARCH_QUERY_PARAM]: null, [TAG_QUERY_PARAM]: null });
  }

  /** Repeats the search in all folders (the "all links" page keeps the query and sort, drops the tags). */
  protected async searchEverywhere(): Promise<void> {
    await this.router.navigate(['/', APP_PATH.Links], {
      queryParams: {
        [SEARCH_QUERY_PARAM]: this.query(),
        [SORT_QUERY_PARAM]: this.feedSort() === FEED_SORT.Newest ? null : this.feedSort(),
      },
    });
  }

  protected async setSort(sort: FeedSort): Promise<void> {
    await this.setQueryParams({ [SORT_QUERY_PARAM]: sort === FEED_SORT.Newest ? null : sort });
  }

  protected async openCrumb(click: BreadcrumbClick): Promise<void> {
    click.event?.preventDefault();
    if (click.item.href) {
      await this.router.navigateByUrl(click.item.href);
    }
  }

  private async setQueryParams(params: Record<string, unknown>): Promise<void> {
    await this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }

  private async setTags(tags: readonly string[]): Promise<void> {
    await this.setQueryParams({ [TAG_QUERY_PARAM]: tags.length > 0 ? tags : null });
  }

  protected setView(view: string): void {
    if (isUiView(view)) {
      // The new list is the same links: no fade-in on top of the morph.
      this.reveal.set(false);
      runViewTransition(this.doc, this.injector, () => this.ui.setView(view), this.morphNames);
    }
  }

  protected retry(): void {
    this.store.setFilter(this.filter());
  }
}
