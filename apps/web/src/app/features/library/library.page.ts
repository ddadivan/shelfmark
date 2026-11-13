import { Dialog } from '@angular/cdk/dialog';
import {
  CdkDrag,
  type CdkDragMove,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
} from '@angular/cdk/drag-drop';
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
  BULK_BAR_LAYOUT,
  BulkBarComponent,
  ButtonComponent,
  CheckboxComponent,
  KEYBOARD_KEY,
  ChipComponent,
  EmptyStateComponent,
  ICON_SIZE,
  loaderVisible,
  LoadMoreComponent,
  MenuComponent,
  MenuItemComponent,
  MenuLabelComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  NoticeComponent,
  ProgressBarComponent,
  SegmentedControlComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type BreadcrumbClick,
  type BulkBarAction,
  type BreadcrumbItem,
  type SegmentedOption,
} from '@shelfmark/ui';
import {
  EXPORT_FORMAT,
  PIN_KIND,
  type ExportFormat,
  type LinkResponse,
} from '@shelfmark/contracts';
import { Router } from '@angular/router';
import { pluralKey } from '../../core/i18n/plural-key';
import { ViewportService } from '../../core/layout/viewport.service';
import { ExportActionsService } from '../export/services/export-actions.service';
import { exportScopeOf } from '../export/utils/export-url';
import { TAG_QUERY_PARAM } from '../tags/models/tag-query-param.const';
import { parseTagFilter } from '../tags/utils/tag-filter';
import { explicitFeedSort, feedSortQuery } from '../links/utils/feed-sort';
import { FEED_SORT } from '../links/models/feed-sort.const';
import type { FeedSort } from '../links/models/feed-sort.type';
import { SEARCH_QUERY_PARAM } from '../links/models/search-query-param.const';
import { SORT_QUERY_PARAM } from '../links/models/sort-query-param.const';
import { KIND_QUERY_PARAM } from '../links/models/kind-query-param.const';
import { parseLinkKind } from '../links/utils/link-kind';
import { SavedViewChipsComponent } from '../views/components/saved-view-chips/saved-view-chips.component';
import { sameFilter } from '../links/utils/links-filter';
import { parseSearchQuery } from '../links/utils/search-query';
import { InViewDirective } from '../links/directives/in-view.directive';
import { parsePastedLinks } from '../links/components/paste-many/parse-pasted-links';
import { isEditableTarget } from '../shortcuts/utils/is-editable-target';
import { pinnedFirst } from '../links/utils/pinned-first';
import { BulkLinkActionsService } from '../links/services/bulk-link-actions.service';
import { BULK_ACTION } from '../links/models/bulk-action.const';
import { isTypingTarget } from '../links/utils/is-typing-target';
import { isLetter } from '../links/utils/link-select-keys';
import { LINK_SELECT_SHORTCUT } from '../links/models/link-select-shortcut.const';
import type { LinkSelectToggle } from '../links/models/link-select-toggle.interface';
import { LinkSelectionStore } from '../../stores/link-selection.store';
import { LinkActionsService } from '../links/services/link-actions.service';
import { DragSlotComponent } from '../links/components/drag-slot/drag-slot.component';
import { LinkDragService } from '../links/services/link-drag.service';
import { HowItWorksService } from '../how-it-works/services/how-it-works.service';
import { LinkCardComponent } from '../links/components/link-card/link-card.component';
import { LinkRowComponent } from '../links/components/link-row/link-row.component';
import type { AddLinkData } from '../links/models/add-link-data.interface';
import type { LinksFilter } from '../links/models/links-filter.type';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { APP_PATH } from '../../models/app-path.const';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { PinsStore } from '../../stores/pins.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { isUiView } from '../../stores/is-ui-view';
import type { UiView } from '../../stores/models/ui-view.type';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { FeedMemoryService } from './services/feed-memory.service';
import { EMPTY_KEYS } from './models/empty-keys.const';
import { EMPTY_ILLUSTRATIONS } from './models/empty-illustrations.const';
import { FILTERED_EMPTY_KEY } from './models/filtered-empty-key.const';
import { SavedViewsStore } from '../../stores/saved-views.store';
import { sameViewQuery } from '../views/utils/saved-view-query';
import { FolderTileComponent } from './components/folder-tile/folder-tile.component';
import { runViewTransition, type ViewTransitionNames } from './utils/view-transition';
import { scrollFeedForKey } from './utils/feed-keyboard-scroll';
import type { SubfolderItem } from './models/subfolder-item.interface';
import { SORT_OPTION_KEYS } from './models/sort-option-keys.const';
import { SORT_OPTIONS } from './models/sort-options.const';
import { VIEW_OPTION_KEYS } from './models/view-option-keys.const';

/** Number of placeholders shown while the first page loads. */
const SKELETON_COUNT = 8;
/** Beat between two cards of a paste of many landing in the feed. */
const LAND_STAGGER_MS = 50;
/** A link of the feed (card or row) and the control that takes focus in it (its stretched link). */
const FEED_ITEM_SELECTOR = 'li.library__item[data-link-id]';
const FEED_ITEM_FOCUS_SELECTOR = '.ui-card__link, .ui-list-item__link';

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
    CdkDragPreview,
    CdkDropList,
    TranslocoPipe,
    BreadcrumbsComponent,
    BulkBarComponent,
    ButtonComponent,
    CheckboxComponent,
    ChipComponent,
    EmptyStateComponent,
    FolderTileComponent,
    InViewDirective,
    LinkCardComponent,
    LinkRowComponent,
    DragSlotComponent,
    LoadMoreComponent,
    MenuComponent,
    MenuItemComponent,
    MenuLabelComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    NoticeComponent,
    ProgressBarComponent,
    SavedViewChipsComponent,
    SegmentedControlComponent,
    SkeletonComponent,
  ],
  templateUrl: './library.page.html',
  styleUrls: ['./library.page.scss', './library-feed.scss', './library-selection.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:paste)': 'onPaste($event)',
  },
})
export default class LibraryPage {
  protected readonly store = inject(LinksStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly memory = inject(FeedMemoryService);
  protected readonly actions = inject(LinkActionsService);
  protected readonly pins = inject(PinsStore);
  protected readonly PIN_KIND = PIN_KIND;
  protected readonly howItWorks = inject(HowItWorksService);
  /** Below 40em: the toolbar folds into one View menu and the short labels. */
  protected readonly phone = inject(ViewportService).phone;
  /**
   * The mobile shell (below 64em, #316): no sidebar to drop on, the touch selection header and
   * the stacked bulk bar over the tab bar, the share action.
   */
  protected readonly compact = inject(ViewportService).compact;
  protected readonly selection = inject(LinkSelectionStore);
  private readonly bulk = inject(BulkLinkActionsService);
  protected readonly drag = inject(LinkDragService);
  /** Touch holds 150 ms before a drag starts (DragDrop spec), so a swipe still scrolls. */
  protected readonly DRAG_START_DELAY = { touch: 150, mouse: 0 };
  private readonly exporter = inject(ExportActionsService);
  private readonly folders = inject(FoldersStore);
  private readonly views = inject(SavedViewsStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly title = inject(Title);
  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly cdkDialogs = inject(Dialog);

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
  /** From the query (`?kind=video`): see `parseLinkKind`. */
  readonly kind = input<unknown>();

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
  /** What the feed remembers its view and sort by: the folder, or the fixed list. */
  private readonly feedKey = computed(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? `folder:${id}` : this.scope();
  });
  /** `?sort=` when it names one, else the feed's own last choice, else the account's default. */
  protected readonly feedSort = computed<FeedSort>(
    () =>
      explicitFeedSort(this.sort()) ??
      this.memory.sort(this.feedKey()) ??
      this.settings.libraryShown().defaultSort,
  );
  /** The feed's own last view, else the account's Default view. */
  protected readonly view = computed<UiView>(
    () => this.memory.view(this.feedKey()) ?? this.settings.libraryShown().defaultView,
  );
  protected readonly linkKind = computed(() => parseLinkKind(this.kind()));
  protected readonly searching = computed(() => this.query() !== '');
  protected readonly filtered = computed(
    () => this.tags().length > 0 || this.searching() || this.linkKind() !== undefined,
  );

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
  /** Scene of the empty feed: one per scope (#315). */
  protected readonly emptyIllustration = computed(() => EMPTY_ILLUSTRATIONS[this.scope()]);
  /** The saved view whose filters the page shows, if any (its empty state names it). */
  protected readonly activeView = computed(() => {
    const filter = this.filter();
    return this.views.items().find((view) => sameViewQuery(view.query, filter));
  });
  /** Empty state of a filtered feed: a saved view, tags only, or other filters. */
  protected readonly filteredEmptyKey = computed(() => {
    if (this.activeView()) {
      return FILTERED_EMPTY_KEY.View;
    }
    return this.linkKind() === undefined ? FILTERED_EMPTY_KEY.Tags : FILTERED_EMPTY_KEY.Filters;
  });
  /** Favorites cannot be filled by adding a link, so its empty state points back to all links. */
  protected readonly canAddLink = computed(() => this.scope() !== LINKS_SCOPE.Favorites);
  protected readonly filter = computed<LinksFilter>(() => {
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
  private readonly ownLinks = computed(() =>
    this.synced() ? pinnedFirst(this.store.entities(), this.isFolder()) : [],
  );
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
  /** A library without any link (the new-account state): no saved view chips, nothing to filter. */
  protected readonly emptyLibrary = computed(
    () => this.empty() && !this.filtered() && this.scope() === LINKS_SCOPE.All,
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
   * The direct subfolders of the folder of the page, in the sidebar order (#314), with the number of folders inside
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
  /** Ids of the links on screen, in order: the range and "select all" of the selection. */
  protected readonly order = computed(() => this.shownLinks().map((link) => link.id));
  /** The picked links that are on screen (a link that left the view drops out by itself). */
  protected readonly selectedLinks = computed(() => {
    const ids = this.selection.idSet();
    return this.shownLinks().filter((link) => ids.has(link.id));
  });
  protected readonly selectedCount = computed(() => this.selectedLinks().length);
  /** A selection is in progress: checkboxes everywhere, the header and the bulk bar show. */
  protected readonly selecting = computed(() => this.selectedCount() > 0);
  protected readonly allSelected = computed(
    () => this.selecting() && this.selectedCount() === this.shownCount(),
  );
  private readonly i18n = toSignal(this.transloco.selectTranslation());
  /** The bulk bar: desktop Move, Tags, Favorite, Open all, Copy links, Delete; the phone shares instead of opening. */
  protected readonly barActions = computed<BulkBarAction[]>(() => {
    this.i18n();
    const t = (key: string): string => this.transloco.translate(key);
    const favorite = this.selecting() && this.selectedLinks().every((link) => link.isFavorite);
    const actions: BulkBarAction[] = [
      { id: BULK_ACTION.Move, label: t('bulk.bar.move'), icon: 'folder-move' },
      { id: BULK_ACTION.Tags, label: t('bulk.bar.tags'), icon: 'tag' },
      {
        id: BULK_ACTION.Favorite,
        label: t('bulk.bar.favorite'),
        icon: favorite ? 'star-filled' : 'star',
        pressed: favorite,
      },
    ];
    if (this.compact()) {
      actions.push(
        this.bulk.canShare()
          ? { id: BULK_ACTION.Share, label: t('bulk.bar.share'), icon: 'share' }
          : { id: BULK_ACTION.Copy, label: t('bulk.bar.copy'), icon: 'copy' },
      );
    } else {
      actions.push(
        { id: BULK_ACTION.OpenAll, label: t('bulk.bar.openAll'), icon: 'external' },
        { id: BULK_ACTION.Copy, label: t('bulk.bar.copy'), icon: 'copy' },
      );
    }
    actions.push({
      id: BULK_ACTION.Delete,
      label: t('bulk.bar.delete'),
      icon: 'trash',
      danger: true,
    });
    return actions;
  });
  protected readonly BULK_BAR_LAYOUT = BULK_BAR_LAYOUT;

  /** The scroll area of the feed (the page itself scrolls on a phone). */
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    void this.settings.load();
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
    // Entering and leaving selection mode is announced politely (the "N selected" header is gone
    // once the mode ends, so it cannot say so itself).
    effect(() => {
      const on = this.selecting();
      untracked(() => {
        if (on !== this.announcedSelecting) {
          this.announcedSelecting = on;
          this.modeAnnouncement.set(
            this.transloco.translate(on ? 'bulk.header.modeOn' : 'bulk.header.modeOff'),
          );
        }
      });
    });
    // A new view, filter, sort or route starts without a selection; links that left the view
    // (deleted, moved out) leave the selection too.
    effect(() => {
      this.filter();
      untracked(() => this.selection.clear());
    });
    effect(() => {
      const order = this.order();
      untracked(() => {
        if (!this.stale()) {
          this.selection.keep(order);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.title.setTitle(this.appName);
      this.selection.clear();
    });
    // The sidebar loads the folders too (the phone has none yet); the call is shared.
    void this.folders.load();
    this.store.setFilter(this.filter);
  }

  /** The stagger of a link that is landing: each card of a paste lands a beat after the one before. */
  protected landDelay(id: string): string | null {
    const position = this.store.landed()[id];
    return position === undefined || position === 0 ? null : `${position * LAND_STAGGER_MS}ms`;
  }

  /**
   * ⌘V / Ctrl+V in the library, outside any field and while no dialog is open: text with a link
   * opens Add link with it (one link fills the address, several turn the dialog into the list).
   * Text without a link is left alone.
   */
  protected onPaste(event: ClipboardEvent): void {
    if (
      event.defaultPrevented ||
      isEditableTarget(event.target) ||
      this.cdkDialogs.openDialogs.length > 0
    ) {
      return;
    }
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (parsePastedLinks(text).links.length === 0) {
      return;
    }
    event.preventDefault();
    void this.actions.addLink({ ...this.addLinkData(), text });
  }

  /** Polite live text for entering / leaving selection mode (empty until the first change). */
  protected readonly modeAnnouncement = signal('');
  private announcedSelecting = false;

  /** A drag began: the drag service takes the links along and a screen reader hears what moves. */
  protected onDragStarted(link: LinkResponse): void {
    this.drag.start(link, this.selectedLinks());
    const count = this.bundled(link) ? this.selectedCount() : 1;
    this.modeAnnouncement.set(
      this.transloco.translate(pluralKey('links.drag.started', count), { count }),
    );
  }

  /** The drag ended (drop or Esc): clears the spoken text, the toast tells what moved. */
  protected onDragEnded(): void {
    this.modeAnnouncement.set('');
    this.drag.drop();
  }

  /** Dragging a picked link (with others picked) carries the whole selection. */
  protected bundled(link: LinkResponse): boolean {
    return this.selectedCount() > 1 && this.selection.has(link.id);
  }

  /** How many links a drag of `link` carries: the whole selection when it travels, else 1. */
  protected dragCount(link: LinkResponse): number {
    return this.bundled(link) ? this.selectedCount() : 1;
  }

  /** Label key of the drag preview badge: "Move 1 link" / "Move 3 links" (plural per language). */
  protected dragLabelKey(link: LinkResponse): string {
    return pluralKey('links.drag.move', this.dragCount(link));
  }

  /** Hit-tests the folders under the pointer while a link is dragged. */
  protected onDragMoved(event: CdkDragMove<unknown>): void {
    this.drag.move(event.pointerPosition.x, event.pointerPosition.y);
  }

  /**
   * Page keys: Esc clears the selection, Cmd/Ctrl+A selects every link on screen (not in a field,
   * dialog or menu); with nothing focused the paging keys scroll the feed area.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.selectionKey(event)) {
      return;
    }
    const area = this.scroller()?.nativeElement;
    if (area) {
      scrollFeedForKey(area, event);
    }
  }

  private selectionKey(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.isComposing || isTypingTarget(event.target)) {
      return false;
    }
    if (event.key === KEYBOARD_KEY.Escape && this.selecting()) {
      this.endSelection();
      return true;
    }
    const selectAll =
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey &&
      isLetter(event, LINK_SELECT_SHORTCUT.SelectAllKey, LINK_SELECT_SHORTCUT.SelectAllCode);
    if (selectAll && this.showLinks() && !this.stale() && this.shownCount() > 0) {
      event.preventDefault();
      this.selectAll();
      return true;
    }
    return false;
  }

  /** A card or row asked to toggle (checkbox, click while selecting, Space, long press). */
  protected toggleSelected(link: LinkResponse, toggle: LinkSelectToggle): void {
    this.selection.toggle(link.id, this.order(), toggle.range);
  }

  protected selectAll(): void {
    this.selection.selectAll(this.order());
  }

  protected toggleAll(checked: boolean): void {
    if (checked) {
      this.selectAll();
    } else {
      this.endSelection();
    }
  }

  protected clearSelection(): void {
    this.selection.clear();
  }

  /**
   * Leaves selection mode (Esc, Done, the header box, the phone's close button). The selection bar
   * that may hold focus goes away, so focus returns to the feed: it stays on a card or row that
   * has it, else goes to the link last picked (the selection anchor), else to the first one, and
   * never falls to the toolbar above the feed.
   */
  protected endSelection(): void {
    const anchor = this.selection.anchor();
    this.clearSelection();
    const active = this.doc.activeElement;
    if (active instanceof HTMLElement && active.closest(FEED_ITEM_SELECTOR)) {
      return;
    }
    const items = [...this.host.querySelectorAll<HTMLElement>(FEED_ITEM_SELECTOR)];
    const item = items.find((candidate) => candidate.dataset['linkId'] === anchor) ?? items[0];
    item?.querySelector<HTMLElement>(FEED_ITEM_FOCUS_SELECTOR)?.focus();
  }

  /** A bulk bar button: runs the action on the picked links; some clear the selection afterwards. */
  protected async runBulk(id: string): Promise<void> {
    const links = this.selectedLinks();
    let clear = false;
    switch (id) {
      case BULK_ACTION.Move:
        clear = await this.bulk.move(links);
        break;
      case BULK_ACTION.Tags:
        clear = await this.bulk.editTags(links);
        break;
      case BULK_ACTION.Favorite:
        clear = await this.bulk.toggleFavorite(links);
        break;
      case BULK_ACTION.OpenAll:
        clear = await this.bulk.openAll(links);
        break;
      case BULK_ACTION.Copy:
        clear = await this.bulk.copy(links);
        break;
      case BULK_ACTION.Share:
        clear = await this.bulk.share(links);
        break;
      case BULK_ACTION.Delete:
        clear = await this.bulk.delete(links);
        break;
    }
    if (clear) {
      this.clearSelection();
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

  /** Clears everything the filter holds: the search, the tags and the kind. */
  protected async clearAll(): Promise<void> {
    await this.setQueryParams({
      [SEARCH_QUERY_PARAM]: null,
      [TAG_QUERY_PARAM]: null,
      [KIND_QUERY_PARAM]: null,
    });
  }

  /** Takes the kind out of the filter. */
  protected async clearKind(): Promise<void> {
    await this.setQueryParams({ [KIND_QUERY_PARAM]: null });
  }

  /** The empty filtered state: drops the tags and the kind (the search has its own state). */
  protected async clearFilters(): Promise<void> {
    await this.setQueryParams({ [TAG_QUERY_PARAM]: null, [KIND_QUERY_PARAM]: null });
  }

  /** Repeats the search in all folders (the "all links" page keeps the query and sort, drops the tags). */
  protected async searchEverywhere(): Promise<void> {
    await this.router.navigate(['/', APP_PATH.Links], {
      queryParams: {
        [SEARCH_QUERY_PARAM]: this.query(),
        [SORT_QUERY_PARAM]: this.sortParam(this.feedSort()),
      },
    });
  }

  /** Remembers the sort for this feed; the URL names it only when it differs from the default. */
  protected async setSort(sort: FeedSort): Promise<void> {
    this.memory.remember(this.feedKey(), { sort });
    await this.setQueryParams({ [SORT_QUERY_PARAM]: this.sortParam(sort) });
  }

  /** `?sort=` for a sort: left out for the account's default (the URL stays short). */
  private sortParam(sort: FeedSort): FeedSort | null {
    return sort === this.settings.libraryShown().defaultSort ? null : sort;
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
      const feed = this.feedKey();
      runViewTransition(
        this.doc,
        this.injector,
        () => this.memory.remember(feed, { view }),
        this.morphNames,
      );
    }
  }

  protected retry(): void {
    this.store.setFilter(this.filter());
  }
}
