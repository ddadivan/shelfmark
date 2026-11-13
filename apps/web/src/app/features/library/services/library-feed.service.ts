import {
  computed,
  DOCUMENT,
  effect,
  inject,
  Injector,
  Service,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { loaderVisible, type SegmentedOption } from '@shelfmark/ui';
import { combineLatest, map } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { isUiView } from '../../../stores/is-ui-view';
import { UI_VIEW } from '../../../stores/models/ui-view.const';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { pinnedFirst } from '../../links/utils/pinned-first';
import { sameFilter } from '../../links/utils/links-filter';
import { LAND_STAGGER_MS } from '../models/land-stagger-ms.const';
import type { LastShown } from '../models/last-shown.interface';
import type { SubfolderItem } from '../models/subfolder-item.interface';
import { VIEW_OPTION_KEYS } from '../models/view-option-keys.const';
import { runViewTransition, type ViewTransitionNames } from '../utils/view-transition';
import { LibraryFilterService } from './library-filter.service';

/**
 * The links the library page shows: the app-wide links store narrowed to the page's filter, the
 * last settled list that stays on screen while the next view loads (stale), the first-load
 * skeleton, the empty and error states, the subfolders and the cards / list switch with its morph.
 * Page-scoped: the page provides it.
 */
@Service({ autoProvided: false })
export class LibraryFeedService {
  private readonly store = inject(LinksStore);
  private readonly filters = inject(LibraryFilterService);
  private readonly folders = inject(FoldersStore);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /**
   * The store is app-wide: when the page opens (back from another page) it can still hold the
   * links of another view for a moment. Those never show, and never become the "previous view".
   */
  private readonly synced = computed(() => sameFilter(this.store.filter(), this.filters.filter()));
  private readonly ownCount = computed(() => (this.synced() ? this.store.count() : 0));
  private readonly ownError = computed(() => this.synced() && this.store.error());
  private readonly ownLoaded = computed(() => this.synced() && this.store.loaded());
  private readonly ownLinks = computed(() =>
    this.synced() ? pinnedFirst(this.store.entities(), this.filters.isFolder()) : [],
  );
  /** The last list that was fully loaded; it stays on screen while the next view loads. */
  private readonly lastShown = signal<LastShown>({ items: [], hasMore: false });
  /**
   * The view changed and its first page is on the way: the store has no links yet, the cards of
   * the previous view stay (inert, no skeleton, no dimming) under the progress bar.
   */
  readonly stale = computed(
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
  readonly batch = signal(0);
  readonly batches = computed(() => [this.batch()]);
  /** The new list fades in only when it replaces a skeleton; on a view switch it just swaps. */
  readonly reveal = signal(false);
  /**
   * The cards <-> list switch is running: the links carry their `view-transition-name`. Only then,
   * so the names never take part in the router's page transition (cards would fly between pages).
   */
  readonly morphing = signal(false);
  readonly morphNames: ViewTransitionNames = {
    on: () => this.morphing.set(true),
    off: () => this.morphing.set(false),
  };
  readonly shownLinks = computed(() => (this.stale() ? this.lastShown().items : this.ownLinks()));
  readonly shownCount = computed(() => this.shownLinks().length);
  readonly shownHasMore = computed(() =>
    this.stale() ? this.lastShown().hasMore : this.store.hasMore(),
  );
  readonly firstLoad = computed(
    () => !this.ownLoaded() && !this.ownError() && this.ownCount() === 0 && !this.stale(),
  );
  /**
   * The skeleton of the first load: nothing shows before 300 ms (a fast response never flashes
   * it) and, once shown, it stays at least 400 ms (Loading spec).
   */
  readonly skeletonVisible = loaderVisible(this.firstLoad);
  readonly failed = computed(() => this.ownError() && this.ownCount() === 0);
  readonly empty = computed(
    () => this.ownLoaded() && !this.store.loading() && this.ownCount() === 0,
  );
  /** A library without any link (the new-account state): no saved view chips, nothing to filter. */
  readonly emptyLibrary = computed(
    () => this.empty() && !this.filters.filtered() && this.filters.scope() === LINKS_SCOPE.All,
  );
  /** The 2px bar: a refetch and a view switch (the old content stays on screen meanwhile). */
  readonly refetching = computed(() => this.store.loading() && (this.ownLoaded() || this.stale()));
  readonly showLinks = computed(() => this.ownCount() > 0 || this.stale());
  /** Sort and view switch: with links, and while the first page loads (so the toolbar keeps its size). */
  readonly showControls = computed(() => this.showLinks() || this.firstLoad());

  private readonly labels = toSignal(
    combineLatest([
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.Cards]),
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.List]),
    ]).pipe(map(([cards, list]) => ({ cards, list }))),
  );
  /** Icon-only switch; `null` until the translations are loaded. */
  readonly viewOptions = computed<SegmentedOption[] | null>(() => {
    const labels = this.labels();
    return labels
      ? [
          { value: UI_VIEW.Cards, label: labels.cards, icon: 'cards' },
          { value: UI_VIEW.List, label: labels.list, icon: 'list' },
        ]
      : null;
  });

  /**
   * The direct subfolders of the folder of the page, in the sidebar order (#314), with the number of folders inside
   * each. Hidden while a search or tag filter is on (they do not filter) and for a missing folder.
   */
  private readonly currentSubfolders = computed<readonly SubfolderItem[]>(() => {
    const id = this.filters.folderId();
    if (
      !this.filters.isFolder() ||
      id === undefined ||
      this.filters.folderMissing() ||
      this.filters.filtered()
    ) {
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
  readonly subfolders = computed(() =>
    this.stale() ? this.lastSubfolders() : this.currentSubfolders(),
  );

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
    // The sidebar loads the folders too (the phone has none yet); the call is shared.
    void this.folders.load();
    this.store.setFilter(this.filters.filter);
  }

  /** The stagger of a link that is landing: each card of a paste lands a beat after the one before. */
  landDelay(id: string): string | null {
    const position = this.store.landed()[id];
    return position === undefined || position === 0 ? null : `${position * LAND_STAGGER_MS}ms`;
  }

  /** Switches cards / list: a view transition morphs the links; the new list does not fade in. */
  setView(view: string): void {
    if (isUiView(view)) {
      // The new list is the same links: no fade-in on top of the morph.
      this.reveal.set(false);
      const feed = this.filters.feedKey();
      runViewTransition(
        this.doc,
        this.injector,
        () => this.filters.rememberView(view, feed),
        this.morphNames,
      );
    }
  }

  /** Asks the store for the first page of the filter again. */
  retry(): void {
    this.store.setFilter(this.filters.filter());
  }
}
