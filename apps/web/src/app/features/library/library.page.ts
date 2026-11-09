import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
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
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { Router } from '@angular/router';
import { ExportActionsService } from '../export/export-actions.service';
import { exportScopeOf } from '../export/export-url';
import { TAG_QUERY_PARAM } from '../tags/models/tag-query-param.const';
import { parseTagFilter } from '../tags/tag-filter';
import { feedSortQuery, parseFeedSort } from '../links/feed-sort';
import { FEED_SORT } from '../links/models/feed-sort.const';
import type { FeedSort } from '../links/models/feed-sort.type';
import { SEARCH_QUERY_PARAM } from '../links/models/search-query-param.const';
import { SORT_QUERY_PARAM } from '../links/models/sort-query-param.const';
import { parseSearchQuery } from '../links/search-query';
import { InViewDirective } from '../links/in-view/in-view.directive';
import { LinkActionsService } from '../links/link-actions.service';
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
import { SORT_OPTION_KEYS } from './models/sort-option-keys.const';
import { SORT_OPTIONS } from './models/sort-options.const';
import { VIEW_OPTION_KEYS } from './models/view-option-keys.const';

/** Number of placeholders shown while the first page loads. */
const SKELETON_COUNT = 8;

/**
 * The links feed of one scope (all, unsorted, favorites; the route data sets `scope`): a toolbar
 * with the count and the cards / list switch, then the links, with a skeleton on first load,
 * a progress bar on refetch and error and empty states.
 */
@Component({
  selector: 'app-library-page',
  imports: [
    TranslocoPipe,
    BreadcrumbsComponent,
    ButtonComponent,
    ChipComponent,
    EmptyStateComponent,
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
})
export default class LibraryPage {
  protected readonly store = inject(LinksStore);
  protected readonly ui = inject(UiStore);
  protected readonly actions = inject(LinkActionsService);
  private readonly exporter = inject(ExportActionsService);
  private readonly folders = inject(FoldersStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly title = inject(Title);

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
  protected readonly firstLoad = computed(
    () => !this.store.loaded() && !this.store.error() && this.store.count() === 0,
  );
  protected readonly failed = computed(() => this.store.error() && this.store.count() === 0);
  protected readonly empty = computed(
    () => this.store.loaded() && !this.store.loading() && this.store.count() === 0,
  );
  protected readonly refetching = computed(() => this.store.loading() && this.store.loaded());
  protected readonly showLinks = computed(() => this.store.count() > 0);
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
    // The page no longer scrolls, so with focus on <body> the keys (Space, Page Down, End) would
    // scroll nothing: the list area takes focus once, as the page itself used to take the keys.
    afterNextRender(() => {
      const area = this.scroller()?.nativeElement;
      const doc = area?.ownerDocument;
      if (area && doc && (!doc.activeElement || doc.activeElement === doc.body)) {
        if (getComputedStyle(area).overflowY === 'auto') {
          area.focus({ preventScroll: true });
        }
      }
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
      this.ui.setView(view);
    }
  }

  protected retry(): void {
    this.store.setFilter(this.filter());
  }
}
