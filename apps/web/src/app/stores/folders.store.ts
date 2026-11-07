import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { FOLDER_LIMIT, type FolderDeleteMode, type FolderResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FOLDERS_API } from '../features/links/models/folders-api.const';
import { buildFolderTree, descendantIds, pathTo } from './folder-tree';
import { LinksStore } from './links.store';
import type { FoldersState } from './models/folders-state.interface';

const initialState: FoldersState = {
  counts: { all: 0, unsorted: 0, favorites: 0 },
  loaded: false,
  loading: false,
  error: false,
};

function byName(folders: readonly FolderResponse[]): FolderResponse[] {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The user's folders as a flat list (the API shape) with the counts of the fixed sidebar rows,
 * cached for the whole app. Create waits for the server; rename and move are optimistic and roll
 * back on failure; remove updates the folder list and the loaded links. `reset()` (sign-out)
 * forgets everything and drops responses still in flight.
 */
export const FoldersStore = signalStore(
  { providedIn: 'root' },
  withEntities<FolderResponse>(),
  withState(initialState),
  withComputed(({ entities }) => ({
    /** The nested tree, siblings in list order (by name). */
    tree: computed(() => buildFolderTree(entities())),
    count: computed(() => entities().length),
    /** The per-user folder limit is reached. */
    atLimit: computed(() => entities().length >= FOLDER_LIMIT.PerUserMax),
  })),
  withMethods((store) => {
    // Resolved on use: the sign-out path injects this store without a `FOLDERS_API` in specs.
    const injector = inject(Injector);
    const api = () => injector.get(FOLDERS_API);
    // Bumped only by `reset()`: a response that started before it belongs to the previous user.
    let epoch = 0;
    // Only the newest list request may write (a refresh can overtake an older one).
    let requestSeq = 0;
    let firstLoad: Promise<void> | null = null;

    async function fetchAll(): Promise<void> {
      const started = epoch;
      const seq = ++requestSeq;
      if (!store.loaded()) {
        patchState(store, { loading: true, error: false });
      }
      try {
        const response = await firstValueFrom(api().list());
        if (started !== epoch || seq !== requestSeq) {
          return;
        }
        patchState(store, setAllEntities(byName(response.items)), {
          counts: response.counts,
          loaded: true,
          loading: false,
          error: false,
        });
      } catch {
        if (started === epoch && seq === requestSeq) {
          patchState(store, { loading: false, error: !store.loaded() });
        }
      }
    }

    function replace(id: string, changes: Partial<FolderResponse>): void {
      patchState(
        store,
        setAllEntities(
          byName(
            store
              .entities()
              .map((folder) => (folder.id === id ? { ...folder, ...changes } : folder)),
          ),
        ),
      );
    }

    return {
      /** Loads the list once; later calls reuse the first request. A failure can be retried. */
      load(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        firstLoad ??= fetchAll().finally(() => (firstLoad = null));
        return firstLoad;
      },

      /** Reloads folders and counts after something changed them (a link was saved or deleted). Only once loaded. */
      refresh(): Promise<void> {
        return store.loaded() ? fetchAll() : Promise.resolve();
      },

      /** Ids of every folder below `id` (not `id` itself). */
      descendantIds: (id: string): string[] => descendantIds(store.entities(), id),

      /** The folders from the top level down to `id`, `id` last. */
      pathTo: (id: string): FolderResponse[] => pathTo(store.entities(), id),

      /** Links in `id` and everything below it (the delete dialog). */
      subtreeLinkCount(id: string): number {
        const ids = new Set([id, ...descendantIds(store.entities(), id)]);
        return store
          .entities()
          .filter((folder) => ids.has(folder.id))
          .reduce((sum, folder) => sum + folder.linkCount, 0);
      },

      /** Creates a folder; resolves with it, or `null` when the request failed. */
      async create(name: string, parentId: string | null): Promise<FolderResponse | null> {
        const started = epoch;
        try {
          const folder = await firstValueFrom(
            api().create(parentId === null ? { name } : { name, parentId }),
          );
          if (started !== epoch) {
            return null;
          }
          patchState(store, setAllEntities(byName([...store.entities(), folder])));
          return folder;
        } catch {
          return null;
        }
      },

      /** Renames at once; resolves false (and puts the old name back) when the request fails. */
      async rename(id: string, name: string): Promise<boolean> {
        const previous = store.entityMap()[id];
        if (!previous) {
          return false;
        }
        const started = epoch;
        replace(id, { name });
        try {
          const saved = await firstValueFrom(api().update(id, { name }));
          if (started === epoch) {
            replace(id, { updatedAt: saved.updatedAt });
          }
          return true;
        } catch {
          if (started === epoch) {
            replace(id, { name: previous.name });
          }
          return false;
        }
      },

      /**
       * Moves at once (`null` = top level); resolves false (and moves it back) when the request
       * fails. Moving into itself or a descendant is refused without a request.
       */
      async move(id: string, parentId: string | null): Promise<boolean> {
        const previous = store.entityMap()[id];
        if (
          !previous ||
          parentId === id ||
          (parentId !== null && descendantIds(store.entities(), id).includes(parentId))
        ) {
          return false;
        }
        const started = epoch;
        replace(id, { parentId });
        try {
          const saved = await firstValueFrom(api().update(id, { parentId }));
          if (started === epoch) {
            replace(id, { updatedAt: saved.updatedAt });
          }
          return true;
        } catch {
          if (started === epoch) {
            replace(id, { parentId: previous.parentId });
          }
          return false;
        }
      },

      /**
       * Deletes the folder and its subfolders. On success the folders leave the list and the
       * loaded links follow `mode`; counts are reloaded. Resolves false when the request fails.
       */
      async remove(id: string, mode: FolderDeleteMode): Promise<boolean> {
        if (!store.entityMap()[id]) {
          return false;
        }
        const started = epoch;
        const doomed = new Set([id, ...descendantIds(store.entities(), id)]);
        try {
          await firstValueFrom(api().remove(id, mode));
        } catch {
          return false;
        }
        if (started !== epoch) {
          return true;
        }
        patchState(
          store,
          setAllEntities(store.entities().filter((folder) => !doomed.has(folder.id))),
        );
        injector.get(LinksStore).applyFolderRemoval([...doomed], mode);
        void fetchAll();
        return true;
      },

      /** Sign-out: forgets everything of this user and drops responses still in flight. */
      reset(): void {
        epoch++;
        requestSeq++;
        firstLoad = null;
        patchState(store, initialState, removeAllEntities());
      },
    };
  }),
);
