import { computed, inject, Injector } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import {
  FOLDER_LIMIT,
  type FolderColour,
  type FolderDeleteMode,
  type FolderEmoji,
  type FolderIcon,
  type FolderResponse,
  type HexColour,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FOLDERS_API } from '../features/links/models/folders-api.const';
import {
  buildFolderTree,
  descendantIds,
  endPosition,
  byName,
  pathTo,
  reorderedSiblings,
} from './folder-tree';
import { LinksStore } from './links.store';
import { PinsStore } from './pins.store';
import type { FoldersState } from './models/folders-state.interface';
import { SessionScope } from '../core/auth/session-scope.service';

const initialState: FoldersState = {
  counts: { all: 0, unsorted: 0, favorites: 0 },
  loaded: false,
  loading: false,
  error: false,
};

/**
 * The user's folders as a flat list (the API shape) with the counts of the fixed sidebar rows,
 * cached for the whole app. Create waits for the server; rename, move and reorder are optimistic and
 * roll back on failure; remove updates the folder list and the loaded links. `reset()` (sign-out)
 * forgets everything and drops responses still in flight.
 */
export const FoldersStore = signalStore(
  { providedIn: 'root' },
  withEntities<FolderResponse>(),
  withState(initialState),
  withComputed(({ entities }) => ({
    /** The nested tree, siblings in list order (manual position, then name). */
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
    // A list that was requested before a create / rename / move / remove must not overwrite it
    // on arrival: `version` changes at the start and the end of every mutation, `inFlight` counts
    // the running ones. Such a list is dropped and asked for again once nothing is running.
    let version = 0;
    let inFlight = 0;
    let refetchWanted = false;

    function begin(): number {
      inFlight++;
      version++;
      return epoch;
    }

    function finish(token: number): void {
      if (token !== epoch) {
        return;
      }
      inFlight--;
      version++;
      if (inFlight === 0 && refetchWanted) {
        refetchWanted = false;
        void fetchAll();
      }
    }

    async function fetchAll(): Promise<void> {
      const started = epoch;
      const startedVersion = version;
      const seq = ++requestSeq;
      if (!store.loaded()) {
        patchState(store, { loading: true, error: false });
      }
      try {
        const response = await firstValueFrom(api().list());
        if (started !== epoch || seq !== requestSeq) {
          return;
        }
        if (version !== startedVersion || inFlight > 0) {
          // Stale against a mutation: ask again now, or when the last mutation ends.
          if (inFlight > 0) {
            refetchWanted = true;
            return;
          }
          return fetchAll();
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

    function setPositions(positions: ReadonlyMap<string, number>): void {
      patchState(
        store,
        setAllEntities(
          byName(
            store.entities().map((folder) => {
              const position = positions.get(folder.id);
              return position === undefined ? folder : { ...folder, position };
            }),
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
        const token = begin();
        try {
          const folder = await firstValueFrom(
            api().create(parentId === null ? { name } : { name, parentId }),
          );
          if (token !== epoch) {
            return null;
          }
          patchState(store, setAllEntities(byName([...store.entities(), folder])));
          return folder;
        } catch {
          return null;
        } finally {
          finish(token);
        }
      },

      /** Renames at once; resolves false (and puts the old name back) when the request fails. */
      async rename(id: string, name: string): Promise<boolean> {
        const previous = store.entityMap()[id];
        if (!previous) {
          return false;
        }
        const token = begin();
        replace(id, { name });
        try {
          const saved = await firstValueFrom(api().update(id, { name }));
          if (token === epoch) {
            replace(id, { updatedAt: saved.updatedAt });
          }
          return true;
        } catch {
          // Only while the name is still the optimistic one: a later edit must not be undone.
          if (token === epoch && store.entityMap()[id]?.name === name) {
            replace(id, { name: previous.name });
          }
          return false;
        } finally {
          finish(token);
        }
      },

      /**
       * Sets colour and / or icon at once; resolves false (and puts the old style back) when the
       * request fails.
       */
      async setStyle(
        id: string,
        style: { colour?: FolderColour | HexColour; icon?: FolderIcon | FolderEmoji },
      ): Promise<boolean> {
        const previous = store.entityMap()[id];
        if (!previous) {
          return false;
        }
        const token = begin();
        const changes: Partial<FolderResponse> = {
          ...(style.colour !== undefined && { colour: style.colour }),
          ...(style.icon !== undefined && { icon: style.icon }),
        };
        replace(id, changes);
        try {
          const saved = await firstValueFrom(api().update(id, style));
          if (token === epoch) {
            replace(id, { updatedAt: saved.updatedAt });
          }
          return true;
        } catch {
          // Only what is still the optimistic value goes back: a later edit must not be undone.
          if (token === epoch) {
            const current = store.entityMap()[id];
            replace(id, {
              ...(style.colour !== undefined &&
                current?.colour === style.colour && { colour: previous.colour }),
              ...(style.icon !== undefined &&
                current?.icon === style.icon && { icon: previous.icon }),
            });
          }
          return false;
        } finally {
          finish(token);
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
        const token = begin();
        // A move goes to the end of the new parent (the API does the same).
        const position =
          parentId === previous.parentId
            ? previous.position
            : endPosition(store.entities(), parentId, id);
        replace(id, { parentId, position });
        try {
          const saved = await firstValueFrom(api().update(id, { parentId }));
          if (token === epoch) {
            replace(id, { updatedAt: saved.updatedAt, position: saved.position });
          }
          return true;
        } catch {
          // Only while the parent is still the optimistic one: a later move must not be undone.
          if (token === epoch && store.entityMap()[id]?.parentId === parentId) {
            replace(id, { parentId: previous.parentId, position: previous.position });
          }
          return false;
        } finally {
          finish(token);
        }
      },

      /** The folders that share the parent of `id` (itself included), in order. */
      siblingsOf(id: string): FolderResponse[] {
        const folder = store.entityMap()[id];
        return folder ? store.entities().filter((other) => other.parentId === folder.parentId) : [];
      },

      /**
       * Moves the folder to `toIndex` among its siblings at once (never to another parent);
       * resolves false (and puts the order back) when the request fails.
       */
      async reorder(id: string, toIndex: number): Promise<boolean> {
        const folder = store.entityMap()[id];
        if (!folder) {
          return false;
        }
        const siblings = store.entities().filter((other) => other.parentId === folder.parentId);
        const from = siblings.findIndex((other) => other.id === id);
        const to = Math.max(0, Math.min(toIndex, siblings.length - 1));
        if (from === to) {
          return true;
        }
        const next = reorderedSiblings(siblings, from, to);
        const before = new Map(siblings.map((other) => [other.id, other.position]));
        const wanted = new Map(next.map((other, position) => [other.id, position]));
        const token = begin();
        setPositions(wanted);
        try {
          await firstValueFrom(
            api().reorder({ parentId: folder.parentId, ids: next.map((other) => other.id) }),
          );
          return true;
        } catch {
          // Only while the order is still the optimistic one: a later change must not be undone.
          if (
            token === epoch &&
            [...wanted].every(([key, position]) => store.entityMap()[key]?.position === position)
          ) {
            setPositions(before);
          }
          return false;
        } finally {
          finish(token);
        }
      },

      /**
       * Deletes the folder and its subfolders. On success `beforeApply` runs (the caller can leave
       * the page of a deleted folder), then the folders leave the list and the loaded links follow
       * `mode`; counts are reloaded. Resolves false when the request fails.
       */
      async remove(
        id: string,
        mode: FolderDeleteMode,
        beforeApply?: (doomed: readonly string[]) => Promise<void>,
      ): Promise<boolean> {
        if (!store.entityMap()[id]) {
          return false;
        }
        const token = begin();
        const doomed = new Set([id, ...descendantIds(store.entities(), id)]);
        try {
          await firstValueFrom(api().remove(id, mode));
        } catch {
          finish(token);
          return false;
        }
        if (token !== epoch) {
          return true;
        }
        // The tree may have changed while the request ran (a subfolder created or moved in).
        for (const below of descendantIds(store.entities(), id)) {
          doomed.add(below);
        }
        await beforeApply?.([...doomed]);
        if (token === epoch) {
          patchState(
            store,
            setAllEntities(store.entities().filter((folder) => !doomed.has(folder.id))),
          );
          injector.get(LinksStore).applyFolderRemoval([...doomed], mode);
          injector.get(PinsStore).dropFolders([...doomed]);
          finish(token);
          void fetchAll();
        }
        return true;
      },

      /** Sign-out: forgets everything of this user and drops responses still in flight. */
      reset(): void {
        epoch++;
        requestSeq++;
        version++;
        inFlight = 0;
        refetchWanted = false;
        firstLoad = null;
        patchState(store, initialState, removeAllEntities());
      },
    };
  }),
  withHooks({
    onInit() {
      // Resolved on use, so a call goes through the store as it is by then.
      const injector = inject(Injector);
      inject(SessionScope).onEnd(() => injector.get(FoldersStore).reset());
    },
  }),
);
