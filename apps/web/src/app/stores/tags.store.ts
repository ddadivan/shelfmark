import { DOCUMENT } from '@angular/common';
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
import { TAG_ERROR_MESSAGE, TAG_LIMIT, type TagResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { hasApiMessage } from '../core/api/api-error';
import { isConflictError } from '../core/api/is-conflict-error';
import { TAGS_API } from '../features/links/models/tags-api.const';
import { LinksStore } from './links.store';
import { TAG_OUTCOME } from './models/tag-outcome.const';
import type { TagResult } from './models/tag-result.interface';
import type { TagsState } from './models/tags-state.interface';
import { SessionScope } from '../core/auth/session-scope.service';

const initialState: TagsState = { loaded: false, loading: false, error: false };

/** The API order: most used first, then by name. */
function sorted(tags: readonly TagResponse[]): TagResponse[] {
  return [...tags].sort((a, b) => b.linkCount - a.linkCount || a.name.localeCompare(b.name));
}

function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * The user's tags with link counts, cached for the whole app. Create and merge wait for the
 * server; rename is optimistic and rolls back (also on a 409, which comes back as `Conflict` with
 * the tag that owns the name, so the UI can offer a merge). A delete is deferred like a link's:
 * `hide()` removes the tag from the list, `undoRemove()` brings it back, `commitRemove()` sends
 * the request. Renames, merges and deletes keep the loaded links in `LinksStore` in sync.
 * `reset()` (sign-out) forgets everything and drops responses still in flight.
 */
export const TagsStore = signalStore(
  { providedIn: 'root' },
  withEntities<TagResponse>(),
  withState(initialState),
  withComputed(({ entities }) => ({
    count: computed(() => entities().length),
    /** The per-user tag limit is reached. */
    atLimit: computed(() => entities().length >= TAG_LIMIT.PerUserMax),
  })),
  withMethods((store) => {
    // Resolved on use: the sign-out path injects this store without a `TAGS_API` in specs.
    const injector = inject(Injector);
    const api = () => injector.get(TAGS_API);
    const links = () => injector.get(LinksStore);
    // Bumped only by `reset()`: a response that started before it belongs to the previous user.
    let epoch = 0;
    // Only the newest list request may write.
    let requestSeq = 0;
    let firstLoad: Promise<void> | null = null;
    // A list requested before a mutation must not overwrite it on arrival (see `FoldersStore`).
    let version = 0;
    let inFlight = 0;
    let refetchWanted = false;
    const pending = new Map<string, { tag: TagResponse; committing: boolean }>();
    // Renames of one tag can overlap (the second starts from the optimistic name of the first).
    // The links still carry the name the server confirmed last, so `renameTag` goes from that
    // one, not from the optimistic name.
    const renaming = new Map<string, { confirmed: string; running: number; done: number }>();
    let renameSeq = 0;

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
        const items = await firstValueFrom(api().list());
        if (started !== epoch || seq !== requestSeq) {
          return;
        }
        if (version !== startedVersion || inFlight > 0) {
          if (inFlight > 0) {
            refetchWanted = true;
            return;
          }
          return fetchAll();
        }
        patchState(store, setAllEntities(sorted(items.filter((tag) => !pending.has(tag.id)))), {
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

    function replace(id: string, changes: Partial<TagResponse>): void {
      patchState(
        store,
        setAllEntities(
          sorted(store.entities().map((tag) => (tag.id === id ? { ...tag, ...changes } : tag))),
        ),
      );
    }

    function owner(name: string, exceptId?: string): TagResponse | undefined {
      return store.entities().find((tag) => tag.id !== exceptId && sameName(tag.name, name));
    }

    async function commitRemove(id: string): Promise<boolean> {
      const removal = pending.get(id);
      if (!removal || removal.committing) {
        return true;
      }
      // Counted as a mutation: a list requested before it ends must not bring the tag back.
      const token = begin();
      removal.committing = true;
      try {
        await firstValueFrom(api().remove(id));
      } catch {
        if (token === epoch) {
          restore(id);
        }
        return false;
      } finally {
        finish(token);
      }
      if (token === epoch) {
        pending.delete(id);
        links().dropTag(removal.tag.name);
      }
      return true;
    }

    function restore(id: string): void {
      const removal = pending.get(id);
      if (!removal) {
        return;
      }
      pending.delete(id);
      patchState(store, setAllEntities(sorted([...store.entities(), removal.tag])));
    }

    function refresh(): Promise<void> {
      return store.loaded() ? fetchAll() : Promise.resolve();
    }

    return {
      /** Loads the list once; later calls reuse the first request. A failure can be retried. */
      load(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        if (firstLoad === null) {
          const request: Promise<void> = fetchAll().finally(() => {
            // `reset()` may have started a newer load meanwhile: clear only our own.
            if (firstLoad === request) {
              firstLoad = null;
            }
          });
          firstLoad = request;
        }
        return firstLoad;
      },

      /** Reloads the tags and counts after something changed them. Only once loaded. */
      refresh,

      /** A link was saved, edited or deleted: its tags may be new and the counts moved. */
      noteLinkSaved(): Promise<void> {
        // New names need ids and known ones new counts: the list answers both.
        return refresh();
      },

      /** Creates an empty tag. */
      async create(name: string): Promise<TagResult> {
        const existing = owner(name);
        if (existing) {
          return { outcome: TAG_OUTCOME.Conflict, tag: existing };
        }
        const token = begin();
        try {
          const tag = await firstValueFrom(api().create({ name }));
          if (token !== epoch) {
            return { outcome: TAG_OUTCOME.Failed };
          }
          patchState(store, setAllEntities(sorted([...store.entities(), tag])));
          return { outcome: TAG_OUTCOME.Done, tag };
        } catch (error) {
          if (hasApiMessage(error, TAG_ERROR_MESSAGE.LimitReached)) {
            return { outcome: TAG_OUTCOME.LimitReached };
          }
          if (isConflictError(error)) {
            return { outcome: TAG_OUTCOME.Conflict, ...ownerField(owner(name)) };
          }
          return { outcome: TAG_OUTCOME.Failed };
        } finally {
          finish(token);
        }
      },

      /**
       * Renames at once; a failure or a 409 puts the old name back. The loaded links follow once
       * the server has accepted it.
       */
      async rename(id: string, name: string): Promise<TagResult> {
        const previous = store.entityMap()[id];
        if (!previous) {
          return { outcome: TAG_OUTCOME.Failed };
        }
        const taken = owner(name, id);
        if (taken) {
          return { outcome: TAG_OUTCOME.Conflict, tag: taken };
        }
        const token = begin();
        const state = renaming.get(id) ?? { confirmed: previous.name, running: 0, done: 0 };
        const seq = ++renameSeq;
        state.running++;
        renaming.set(id, state);
        replace(id, { name });
        try {
          const saved = await firstValueFrom(api().update(id, { name }));
          if (token !== epoch) {
            return { outcome: TAG_OUTCOME.Failed };
          }
          // Only while this is still the newest name: an older reply must not undo a newer edit.
          if (store.entityMap()[id]?.name === name) {
            replace(id, { name: saved.name, updatedAt: saved.updatedAt });
          }
          // Replies can arrive out of order; the server applied them in request order, so a
          // reply older than one already applied has nothing left to say about the links.
          if (seq > state.done) {
            links().renameTag(state.confirmed, saved.name);
            state.confirmed = saved.name;
            state.done = seq;
          }
          return { outcome: TAG_OUTCOME.Done, tag: saved };
        } catch (error) {
          // Only while the name is still the optimistic one: a later edit must not be undone.
          if (token === epoch && store.entityMap()[id]?.name === name) {
            replace(id, { name: previous.name });
          }
          return isConflictError(error)
            ? { outcome: TAG_OUTCOME.Conflict, ...ownerField(owner(name, id)) }
            : { outcome: TAG_OUTCOME.Failed };
        } finally {
          if (token === epoch && --state.running === 0) {
            renaming.delete(id);
          }
          finish(token);
        }
      },

      /** Moves the links of `id` onto `targetId` and removes `id`. Waits for the server. */
      async merge(id: string, targetId: string): Promise<TagResult> {
        const source = store.entityMap()[id];
        const target = store.entityMap()[targetId];
        if (!source || !target || id === targetId) {
          return { outcome: TAG_OUTCOME.Failed };
        }
        const token = begin();
        try {
          const merged = await firstValueFrom(api().merge(id, targetId));
          if (token !== epoch) {
            return { outcome: TAG_OUTCOME.Failed };
          }
          patchState(
            store,
            setAllEntities(
              sorted(
                store
                  .entities()
                  .filter((tag) => tag.id !== id)
                  .map((tag) => (tag.id === targetId ? merged : tag)),
              ),
            ),
          );
          links().renameTag(source.name, merged.name);
          return { outcome: TAG_OUTCOME.Done, tag: merged };
        } catch {
          return { outcome: TAG_OUTCOME.Failed };
        } finally {
          finish(token);
        }
      },

      /** Takes a tag out of the list while its Undo window is open. False when it is not there. */
      hide(id: string): boolean {
        const tag = store.entityMap()[id];
        if (!tag || pending.has(id)) {
          return false;
        }
        pending.set(id, { tag, committing: false });
        patchState(store, setAllEntities(store.entities().filter((item) => item.id !== id)));
        return true;
      },

      /** Brings a hidden tag back. */
      undoRemove: restore,

      /** Sends the delete; resolves false (and brings the tag back) when it fails. */
      commitRemove,

      /** Sends every delete still waiting (page hide, sign-out). */
      async flushPending(): Promise<void> {
        await Promise.all([...pending.keys()].map((id) => commitRemove(id)));
      },

      /** Sign-out: forgets everything of this user and drops responses still in flight. */
      reset(): void {
        epoch++;
        requestSeq++;
        version++;
        inFlight = 0;
        refetchWanted = false;
        firstLoad = null;
        pending.clear();
        renaming.clear();
        patchState(store, initialState, removeAllEntities());
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Resolved on use, so a call goes through the store as it is by then.
      const injector = inject(Injector);
      const scope = inject(SessionScope);
      scope.onEnd(() => injector.get(TagsStore).reset());
      scope.beforeEnd(() => injector.get(TagsStore).flushPending());
      // The page is going away: deletes still in their Undo window are sent (see `LinksStore`).
      inject(DOCUMENT).defaultView?.addEventListener('pagehide', () => {
        void store.flushPending();
      });
    },
  }),
);

function ownerField(tag: TagResponse | undefined): { tag: TagResponse } | Record<string, never> {
  return tag ? { tag } : {};
}
