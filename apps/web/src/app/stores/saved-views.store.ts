import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  SAVED_VIEW_LIMIT,
  type ListSavedViewsQuery,
  type SavedViewQueryRequest,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { isConflictError } from '../core/api/is-conflict-error';
import { SessionScope } from '../core/auth/session-scope.service';
import { SAVED_VIEWS_API } from '../features/views/models/saved-views-api.const';
import type { SavedViewsState } from './models/saved-views-state.interface';
import { VIEW_OUTCOME } from './models/view-outcome.const';
import type { ViewCreateResult } from './models/view-create-result.interface';
import type { ViewOutcome } from './models/view-outcome.type';

const initialState: SavedViewsState = {
  items: [],
  total: null,
  loaded: false,
  feedKey: '',
  loading: false,
  error: false,
};

/** Stable key of a feed, `''` for none. */
export function feedKeyOf(feed: ListSavedViewsQuery | undefined): string {
  return feed ? JSON.stringify([feed.scope ?? '', feed.folderId ?? '', feed.tag ?? []]) : '';
}

function renumber(items: readonly SavedViewResponse[]): SavedViewResponse[] {
  return items.map((item, position) => ({ ...item, position }));
}

function outcomeOf(error: unknown): ViewOutcome {
  if (isConflictError(error)) {
    return VIEW_OUTCOME.Limit;
  }
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound
    ? VIEW_OUTCOME.Missing
    : VIEW_OUTCOME.Failed;
}

/**
 * The saved views above the feed (`/api/views`), with their counts and the total of the "All"
 * chip, cached for the whole app. Create waits for the server (the dialog shows the outcome);
 * rename, delete and move are optimistic and roll back when the request fails, the caller says
 * what failed. `refresh` re-reads the counts after the library changed. The session end forgets
 * everything and drops responses still in flight.
 */
export const SavedViewsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ items }) => ({
    atLimit: computed(() => items().length >= SAVED_VIEW_LIMIT.PerUserMax),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(SAVED_VIEWS_API);
    const scope = inject(SessionScope);
    let epoch = 0;
    // Bumped by every change: a list that started before it must not overwrite it.
    let version = 0;
    let firstLoad: Promise<void> | null = null;
    // The feed the chips sit on (#335); bumped when it changes so a late answer is dropped.
    let feed: ListSavedViewsQuery | undefined;
    let feedSeq = 0;

    async function fetchList(force = false): Promise<void> {
      const started = epoch;
      const startedVersion = version;
      const startedFeed = feedSeq;
      const startedKey = feedKeyOf(feed);
      if (!store.loaded()) {
        patchState(store, { loading: true, error: false });
      }
      try {
        const response = await firstValueFrom(api().list(feed));
        if (started !== epoch || startedFeed !== feedSeq) {
          return;
        }
        patchState(
          store,
          force || startedVersion === version
            ? {
                items: response.items,
                total: response.total,
                loaded: true,
                feedKey: startedKey,
                loading: false,
                error: false,
              }
            : { loading: false, total: response.total, feedKey: startedKey },
        );
      } catch {
        if (started === epoch) {
          patchState(store, { loading: false, error: !store.loaded() });
        }
      }
    }

    function replace(view: SavedViewResponse): void {
      patchState(store, {
        items: store.items().map((item) => (item.id === view.id ? view : item)),
      });
    }

    scope.onEnd(() => {
      epoch++;
      version++;
      firstLoad = null;
      feed = undefined;
      feedSeq++;
      patchState(store, initialState);
    });

    return {
      /** Loads the views once (and again with the counts of another feed); a failure can be retried by calling again. */
      load(next?: ListSavedViewsQuery): Promise<void> {
        if (feedKeyOf(next) !== feedKeyOf(feed)) {
          // Another feed: the counts are read again for it (the views themselves stay).
          feed = next;
          feedSeq++;
          firstLoad = null;
          return fetchList(true);
        }
        if (store.loaded()) {
          return Promise.resolve();
        }
        firstLoad ??= fetchList().finally(() => (firstLoad = null));
        return firstLoad;
      },

      /** Re-reads views and counts (the library changed). Only once loaded. */
      refresh(): Promise<void> {
        return store.loaded() ? fetchList() : Promise.resolve();
      },

      /** Saves a filter as a view at the end; waits for the server. */
      async create(name: string, query: SavedViewQueryRequest): Promise<ViewCreateResult> {
        if (store.atLimit()) {
          return { outcome: VIEW_OUTCOME.Limit };
        }
        const started = epoch;
        try {
          const view = await firstValueFrom(api().create({ name, query }));
          if (started === epoch) {
            version++;
            patchState(store, {
              items: renumber([...store.items().filter((item) => item.id !== view.id), view]),
            });
          }
          return { outcome: VIEW_OUTCOME.Done, view };
        } catch (error) {
          return { outcome: outcomeOf(error) };
        }
      },

      /** Renames at once; resolves false (and puts the old name back) when the request fails. */
      async rename(id: string, name: string): Promise<boolean> {
        const before = store.items().find((item) => item.id === id);
        if (!before || before.name === name) {
          return true;
        }
        const started = epoch;
        version++;
        replace({ ...before, name });
        try {
          const saved = await firstValueFrom(api().update(id, { name }));
          if (started === epoch) {
            replace({ ...saved, position: before.position });
          }
          return true;
        } catch {
          if (started === epoch) {
            version++;
            const current = store.items().find((item) => item.id === id);
            if (current) {
              replace({ ...current, name: before.name });
            }
          }
          return false;
        }
      },

      /** Deletes at once; resolves false (and puts it back in place) when the request fails. */
      async remove(id: string): Promise<boolean> {
        const before = store.items();
        if (!before.some((item) => item.id === id)) {
          return true;
        }
        const started = epoch;
        version++;
        patchState(store, { items: renumber(before.filter((item) => item.id !== id)) });
        try {
          await firstValueFrom(api().remove(id));
          return true;
        } catch {
          if (started === epoch) {
            version++;
            patchState(store, { items: before });
          }
          return false;
        }
      },

      /** Moves a view to `toIndex` at once; resolves false (and puts the order back) when the request fails. */
      async move(id: string, toIndex: number): Promise<boolean> {
        const before = store.items();
        const from = before.findIndex((item) => item.id === id);
        const to = Math.max(0, Math.min(toIndex, before.length - 1));
        if (from < 0 || from === to) {
          return true;
        }
        const next = [...before];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        const started = epoch;
        const mine = ++version;
        patchState(store, { items: renumber(next) });
        try {
          const response = await firstValueFrom(api().reorder(next.map((item) => item.id)));
          if (started === epoch && version === mine) {
            version++;
            // The answer counts the whole library: inside a feed the order is already shown.
            patchState(
              store,
              feed === undefined ? { items: response.items, total: response.total } : {},
            );
          }
          return true;
        } catch {
          if (started === epoch) {
            if (version === mine) {
              version++;
              patchState(store, { items: before });
            } else {
              void fetchList();
            }
          }
          return false;
        }
      },
    };
  }),
);
