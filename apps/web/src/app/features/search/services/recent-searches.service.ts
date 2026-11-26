import { inject, Service, signal } from '@angular/core';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { parseSearchQuery } from '../../links/utils/search-query';
import { RECENT_SEARCHES_MAX } from '../models/recent-searches-max.const';

/**
 * "Recent searches" under the empty search field (Shelf): the last `RECENT_SEARCHES_MAX` texts,
 * newest first, without repeats (ignoring case). Kept on this device (`localStorage`, one of
 * `USER_STORAGE_KEYS`) and forgotten when the session ends; blocked storage keeps them for the
 * visit only.
 */
@Service()
export class RecentSearchesService {
  private readonly storage = inject(SafeStorage);
  private readonly list = signal<readonly string[]>(this.read());

  /** Newest first. */
  readonly items = this.list.asReadonly();

  constructor() {
    inject(SessionScope).onEnd(() => this.list.set([]));
  }

  /** Puts `text` first (normalised like `?q=`); an empty text is ignored. */
  add(text: string): void {
    const query = parseSearchQuery(text);
    if (query === '') {
      return;
    }
    const lower = query.toLowerCase();
    const next = [query, ...this.list().filter((item) => item.toLowerCase() !== lower)].slice(
      0,
      RECENT_SEARCHES_MAX,
    );
    this.list.set(next);
    // Blocked storage: kept for this visit only.
    this.storage.setJson(STORAGE_KEY.RecentSearches, next);
  }

  private read(): readonly string[] {
    return this.storage
      .getJson<unknown[]>(STORAGE_KEY.RecentSearches, Array.isArray, [])
      .filter((item): item is string => typeof item === 'string')
      .map((item) => parseSearchQuery(item))
      .filter((item) => item !== '')
      .slice(0, RECENT_SEARCHES_MAX);
  }
}
