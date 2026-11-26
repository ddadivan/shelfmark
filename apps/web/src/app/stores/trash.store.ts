import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  TRASH_ITEM_KIND,
  TRASH_LIMIT,
  type ListTrashResponse,
  type TrashActionResponse,
  type TrashItem,
  type TrashItemRef,
} from '@shelfmark/contracts';
import { firstValueFrom, type Observable } from 'rxjs';
import { isConflictError } from '../core/api/is-conflict-error';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { TRASH_OUTCOME } from '../features/trash/models/trash-outcome.const';
import type { TrashOutcome } from '../features/trash/models/trash-outcome.type';
import { toRef, trashKey } from '../features/trash/utils/trash-key';
import { FoldersStore } from './folders.store';
import { LibraryRefreshService } from './library-refresh.service';
import { LinksStore } from './links.store';
import { withRemoteLoad } from './features/with-remote-load';
import type { TrashState } from './models/trash-state.interface';
import { UserSettingsStore } from './user-settings.store';

const initialState: TrashState = {
  items: [],
  total: 0,
  loaded: false,
  loading: false,
  error: false,
};

/** Newest first: the order of the API list. */
function newestFirst(items: readonly TrashItem[]): TrashItem[] {
  return [...items].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

function chunks<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

/**
 * What is in Trash, cached for the whole app (the sidebar count and the Trash page). Restore,
 * delete forever and empty are optimistic: the entries leave the list at once and come back when
 * the request fails (the caller toasts). A restore also refreshes the library: links feed, folder
 * tree and counts, tags. A list that was requested before a mutation is dropped on arrival and
 * asked for again once nothing is running (as in `FoldersStore`). The session end forgets
 * everything and drops responses still in flight.
 */
export const TrashStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withRemoteLoad(initialState),
  withComputed(({ items }) => ({
    /** Link entries in the list. */
    linkItems: computed(() => items().filter((item) => item.kind === TRASH_ITEM_KIND.Link)),
    /** Folder entries in the list. */
    folderItems: computed(() => items().filter((item) => item.kind === TRASH_ITEM_KIND.Folder)),
  })),
  withMethods((store) => {
    // Resolved on use: the sign-out path injects stores without a `TRASH_API` in specs.
    const injector = inject(Injector);
    const api = () => injector.get(TRASH_API);
    const read = () => firstValueFrom(api().list());
    const apply = (response: ListTrashResponse): void => {
      patchState(store, {
        items: response.items,
        total: response.total,
        loaded: true,
        loading: false,
        error: false,
      });
      injector.get(UserSettingsStore).noteRetention(response.retentionDays);
    };
    const fetchAll = (): Promise<void> => store._fetchAll(read, apply);

    /** The library after a restore: the feed, the counts, the reminders the links carry. */
    function refreshLibrary(): void {
      injector.get(LibraryRefreshService).afterRestore();
    }

    /**
     * Runs `call` per batch of `TRASH_LIMIT.BatchMax` refs. The entries leave the list first; the
     * ones whose batch fails (and the batches after it) come back.
     */
    async function mutate(
      refs: readonly TrashItemRef[],
      call: (batch: readonly TrashItemRef[]) => Observable<TrashActionResponse>,
      onDone?: () => void,
    ): Promise<TrashOutcome> {
      if (refs.length === 0) {
        return TRASH_OUTCOME.Done;
      }
      const wanted = new Set(refs.map(trashKey));
      const removed = store.items().filter((item) => wanted.has(trashKey(item)));
      const token = store._begin();
      patchState(store, {
        items: store.items().filter((item) => !wanted.has(trashKey(item))),
        total: Math.max(0, store.total() - refs.length),
      });
      let done = 0;
      try {
        for (const batch of chunks(refs, TRASH_LIMIT.BatchMax)) {
          await firstValueFrom(call(batch));
          done += batch.length;
        }
      } catch (error) {
        if (store._isCurrent(token)) {
          const failedKeys = new Set(refs.slice(done).map(trashKey));
          const back = removed.filter((item) => failedKeys.has(trashKey(item)));
          patchState(store, {
            items: newestFirst([...store.items(), ...back]),
            total: store.total() + (refs.length - done),
          });
          if (done > 0) {
            onDone?.();
          }
        }
        store._finish(token);
        return isConflictError(error) ? TRASH_OUTCOME.Conflict : TRASH_OUTCOME.Failed;
      }
      store._finish(token);
      if (store._isCurrent(token)) {
        onDone?.();
        void fetchAll();
      }
      return TRASH_OUTCOME.Done;
    }

    const load = (): Promise<void> => store._ensureLoaded(read, apply);

    return {
      /** Loads the list once; later calls reuse the first request. A failure can be retried. */
      load,

      /**
       * Opening the page: sends the link deletes still waiting for their Undo window first, so the
       * link just deleted is in the list, then loads (or reloads, the old list stays meanwhile).
       */
      async open(): Promise<void> {
        await injector.get(LinksStore).flushPending();
        // A delete that was just sent changed the folder counts (`LinkActionsService` refreshes
        // them only for the deletes it commits itself).
        void injector.get(FoldersStore).refresh();
        await (store.loaded() ? fetchAll() : load());
      },

      /** Reloads after something moved into or out of Trash (a delete). Only once loaded. */
      refresh(): Promise<void> {
        return store.loaded() ? fetchAll() : Promise.resolve();
      },

      /** Puts the entries back; resolves with how it ended. Refreshes the library on success. */
      restore: (refs: readonly TrashItemRef[]): Promise<TrashOutcome> =>
        mutate(refs, (batch) => api().restore(batch), refreshLibrary),

      /** Deletes the entries for good. */
      deleteForever: (refs: readonly TrashItemRef[]): Promise<TrashOutcome> =>
        mutate(refs, (batch) => api().deleteForever(batch)),

      /** Deletes everything in Trash for good. */
      async empty(): Promise<TrashOutcome> {
        const token = store._begin();
        const before = { items: store.items(), total: store.total() };
        patchState(store, { items: [], total: 0 });
        try {
          await firstValueFrom(api().empty());
        } catch (error) {
          if (store._isCurrent(token)) {
            patchState(store, before);
          }
          store._finish(token);
          return isConflictError(error) ? TRASH_OUTCOME.Conflict : TRASH_OUTCOME.Failed;
        }
        store._finish(token);
        if (store._isCurrent(token)) {
          void fetchAll();
        }
        return TRASH_OUTCOME.Done;
      },

      /** The refs of every loaded entry. */
      allRefs: (): TrashItemRef[] => store.items().map(toRef),
    };
  }),
);
