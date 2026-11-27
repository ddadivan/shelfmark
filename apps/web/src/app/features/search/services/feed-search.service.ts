import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { NavigationEnd, Router, type UrlTree } from '@angular/router';
import { filter } from 'rxjs';
import { CurrentUrl } from '../../../core/routing/current-url.service';
import { APP_PATH } from '../../../models/app-path.const';
import { FoldersStore } from '../../../stores/folders.store';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { SEARCH_QUERY_PARAM } from '../../links/models/search-query-param.const';
import { scopeLabelKey } from '../../links/utils/scope-label-key';
import { parseSearchQuery } from '../../links/utils/search-query';
import type { FeedSearchScope } from '../models/feed-search-scope.interface';
import { FEED_SEARCH_PATHS } from '../models/feed-search-paths.const';
import { SEARCH_DEBOUNCE_MS } from '../models/search-debounce-ms.const';

/**
 * The header search of Shelf (from 64em, `03-search.html`): the field filters the library feed in
 * place. `text` is what the field shows; `setText` writes it and, `SEARCH_DEBOUNCE_MS` after the
 * last keystroke, puts it in the URL (`?q=`): on a feed (All links, Unsorted, Favorites, a folder)
 * in that feed, on any other page in All links. The first change of a search adds a history entry
 * (Back leaves the search), the next ones replace it. A URL changed elsewhere (a filter chip,
 * Back, a link with `?q=`) is written back into the field. `scope` says what the search is limited
 * to (a folder, Unsorted, Favorites; `null` on All links); `searchEverywhere()` repeats the text
 * in All links.
 */
@Service()
export class FeedSearchService {
  private readonly router = inject(Router);
  private readonly folders = inject(FoldersStore);
  private readonly currentUrl = inject(CurrentUrl);
  private readonly value = signal('');
  /** The search text the URL holds (normalised); what the field was last synced with. */
  private urlQuery = '';
  private timer: ReturnType<typeof setTimeout> | undefined;

  /** The text of the header field, as typed. */
  readonly text = this.value.asReadonly();

  /** What the search is limited to on the page on screen; `null` on All links and non-feed pages. */
  readonly scope = computed<FeedSearchScope | null>(() => {
    const path = this.currentUrl.path();
    if (path === `/${APP_PATH.Tidy}`) {
      return null;
    }
    const [first, id, ...rest] = path.split('/').filter((segment) => segment !== '');
    if (first === APP_PATH.Unsorted || first === APP_PATH.Favorites) {
      const unsorted = first === APP_PATH.Unsorted;
      const scope = unsorted ? LINKS_SCOPE.Unsorted : LINKS_SCOPE.Favorites;
      return {
        labelKey: scopeLabelKey(scope),
        name: null,
        icon: unsorted ? 'inbox' : 'star',
        colour: null,
      };
    }
    if (first === APP_PATH.Folders && id !== undefined && rest.length === 0) {
      const folder = this.folders.entityMap()[id];
      return folder
        ? { labelKey: null, name: folder.name, icon: folder.icon, colour: folder.colour }
        : null;
    }
    return null;
  });

  constructor() {
    this.syncFromUrl(this.router.parseUrl(this.router.url));
    const sub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.syncFromUrl(this.router.parseUrl(event.urlAfterRedirects)));
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      clearTimeout(this.timer);
    });
  }

  /** The field changed: shown at once, searched after the pause. */
  setText(text: string): void {
    this.value.set(text);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.apply(), SEARCH_DEBOUNCE_MS);
  }

  /** Searches the text now (Enter, a recent search chosen). */
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    await this.apply();
  }

  /** Repeats the text of the field in All links (the scope chip's ×, "Search all links"). */
  async searchEverywhere(): Promise<void> {
    clearTimeout(this.timer);
    const query = parseSearchQuery(this.value());
    await this.router.navigate(['/', APP_PATH.Links], {
      queryParams: query === '' ? {} : { [SEARCH_QUERY_PARAM]: query },
    });
  }

  /** Empties the field and takes the search out of the feed. */
  async clear(): Promise<void> {
    this.value.set('');
    await this.flush();
  }

  private async apply(): Promise<void> {
    const query = parseSearchQuery(this.value());
    if (query === this.urlQuery) {
      return;
    }
    const replaceUrl = this.urlQuery !== '' && query !== '';
    this.urlQuery = query;
    if (this.onFeed(this.router.parseUrl(this.router.url))) {
      await this.router.navigate([], {
        queryParams: { [SEARCH_QUERY_PARAM]: query === '' ? null : query },
        queryParamsHandling: 'merge',
        replaceUrl,
      });
    } else if (query !== '') {
      await this.router.navigate(['/', APP_PATH.Links], {
        queryParams: { [SEARCH_QUERY_PARAM]: query },
      });
    }
  }

  private syncFromUrl(tree: UrlTree): void {
    const query = this.onFeed(tree) ? parseSearchQuery(tree.queryParams[SEARCH_QUERY_PARAM]) : '';
    if (query === this.urlQuery) {
      return;
    }
    this.urlQuery = query;
    clearTimeout(this.timer);
    this.value.set(query);
  }

  private onFeed(tree: UrlTree): boolean {
    const segments = tree.root.children['primary']?.segments.map((segment) => segment.path) ?? [];
    const first = segments[0];
    // `unsorted/tidy` (Tidy Unsorted) is a page of its own, not the Unsorted feed.
    return (
      first !== undefined &&
      FEED_SEARCH_PATHS.includes(first) &&
      segments.join('/') !== APP_PATH.Tidy
    );
  }
}
