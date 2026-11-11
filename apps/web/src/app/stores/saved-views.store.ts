import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  SAVED_VIEW_LIMIT,
  type SavedViewQueryRequest,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { isConflictError } from '../core/api/is-conflict-error';
import { SessionScope } from '../core/auth/session-scope.service';
import { SAVED_VIEWS_API } from '../features/views/models/saved-views-api.const';
import type { SavedViewsState } from './models/saved-views-state.interface';
import { VIEW_OUTCOME } from './models/view-outcome.const';
import type { ViewOutcome } from './models/view-outcome.type';

const initialState: SavedViewsState = {
  items: [],
  total: null,
  loaded: false,
  loading: false,
  error: false,
};

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

    async function fetchList(): Promise<void> {
      const started = epoch;
      const startedVersion = version;
      if (!store.loaded()) {
        patchState(store, { loading: true, error: false });
      }
      try {
        const response = await firstValueFrom(api().list());
        if (started !== epoch) {
          return;
        }
        patchState(
          store,
          startedVersion === version
            ? {
                items: response.items,
                total: response.total,
                loaded: true,
                loading: false,
                error: false,
              }
            : { loading: false, total: response.total },
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
      patchState(store, initialState);
    });

    return {
      /** Loads the views once; a failure can be retried by calling again. */
      load(): Promise<void> {
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
      async create(name: string, query: SavedViewQueryRequest): Promise<ViewOutcome> {
        if (store.atLimit()) {
          return VIEW_OUTCOME.Limit;
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
          return VIEW_OUTCOME.Done;
        } catch (error) {
          return outcomeOf(error);
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
            patchState(store, { items: response.items, total: response.total });
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
