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
import {
  addEntities,
  removeAllEntities,
  removeEntity,
  setAllEntities,
  setEntity,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import type { FolderDeleteMode, LinkResponse } from '@shelfmark/contracts';
import { FOLDER_DELETE_MODE, LINK_SORT_FIELD, SORT_ORDER } from '@shelfmark/contracts';
import { catchError, EMPTY, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { inFilter, linksQuery, sameFilter } from '../features/links/links-filter';
import { hasPendingImages } from '../features/links/link-view';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksFilter } from '../features/links/models/links-filter.type';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import type { PendingRemoval } from '../features/links/models/pending-removal.interface';
import { RECENT_LINKS_LIMIT } from '../features/links/models/recent-links-limit.const';
import type { LinksState } from './models/links-state.interface';

/** Image capture requests in flight at once (the endpoint shares the AddLink rate limit). */
const CAPTURE_CONCURRENCY = 3;

const initialState: LinksState = {
  filter: { scope: LINKS_SCOPE.All },
  nextCursor: null,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: false,
  loadMoreFailed: false,
  recent: [],
  recentLoaded: false,
};

/**
 * Whether an edited link still belongs in the open feed. A favorite flag never removes it (an
 * unfavorited link stays until the next load); leaving "Unsorted" or the open folder does.
 */
function staysAfterEdit(filter: LinksFilter, link: LinkResponse): boolean {
  switch (filter.scope) {
    case LINKS_SCOPE.Unsorted:
      return link.folderId === null;
    case LINKS_SCOPE.Folder:
      return link.folderId === filter.folderId;
    default:
      return true;
  }
}

/** `link` with the tag `from` renamed to `to` (or dropped for `null`); other tags keep their order, no duplicates. */
function retagLink(link: LinkResponse, from: string, to: string | null): LinkResponse {
  if (!link.tags.some((name) => name.toLowerCase() === from.toLowerCase())) {
    return link;
  }
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const name of link.tags) {
    const next = name.toLowerCase() === from.toLowerCase() ? to : name;
    if (next !== null && !seen.has(next.toLowerCase())) {
      seen.add(next.toLowerCase());
      tags.push(next);
    }
  }
  return { ...link, tags };
}

function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const copy = [...list];
  copy.splice(Math.min(index, copy.length), 0, item);
  return copy;
}

/**
 * The links feed and the "Recently opened" list, cached for the whole app. Favorite, delete and
 * remove from history are optimistic: the change shows at once and rolls back when the request fails. A delete is
 * deferred: `remove()` hides the link, `undoRemove()` brings it back, `commitRemove()` (or
 * `flushPending()`, on `pagehide` and `reset()`) sends the request.
 */
export const LinksStore = signalStore(
  { providedIn: 'root' },
  withEntities<LinkResponse>(),
  withState(initialState),
  withComputed(({ entities, nextCursor, filter }) => ({
    scope: computed(() => filter().scope),
    count: computed(() => entities().length),
    hasMore: computed(() => nextCursor() !== null),
  })),
  withMethods((store) => {
    // Resolved on use: the sign-out path injects this store without a `LINKS_API` in specs.
    const injector = inject(Injector);
    const api = () => injector.get(LINKS_API);
    const pending = new Map<string, PendingRemoval>();
    const favoriteBusy = new Set<string>();
    // Links whose image capture was requested this session: one request per link.
    const captureRequested = new Set<string>();
    const captureQueue: LinkResponse[] = [];
    let captureInFlight = 0;
    // Bumped when the filter changes or the store resets: late responses are dropped.
    let generation = 0;
    // Bumped only by `reset()`: a response that started before it belongs to the previous user.
    let epoch = 0;

    function mapRecent(id: string, changes: Partial<LinkResponse>): LinkResponse[] {
      return store.recent().map((link) => (link.id === id ? { ...link, ...changes } : link));
    }

    /**
     * Asks the server to re-capture the images of loaded links that carry the pending marker (their
     * page changed), once per link and session, at most `CAPTURE_CONCURRENCY` at a time so a page
     * of pending links does not burst the AddLink rate limit. A failure is silent: the card keeps
     * the letter.
     */
    function noteLinks(links: readonly LinkResponse[]): void {
      for (const link of links) {
        if (hasPendingImages(link) && !captureRequested.has(link.id)) {
          captureRequested.add(link.id);
          captureQueue.push(link);
        }
      }
      pumpCaptures();
    }

    function pumpCaptures(): void {
      while (captureInFlight < CAPTURE_CONCURRENCY) {
        const next = captureQueue.shift();
        if (next === undefined) {
          return;
        }
        captureInFlight++;
        void captureImages(next).finally(() => {
          captureInFlight--;
          pumpCaptures();
        });
      }
    }

    function loaded(id: string): LinkResponse | undefined {
      return store.entityMap()[id] ?? store.recent().find((link) => link.id === id);
    }

    /** The response is applied only while the link is still the version that was asked about. */
    async function captureImages(asked: LinkResponse): Promise<void> {
      const { id } = asked;
      const started = epoch;
      try {
        const saved = await firstValueFrom(api().captureImages(id));
        if (started !== epoch || pending.has(id)) {
          return;
        }
        const current = loaded(id);
        if (current?.updatedAt === asked.updatedAt && hasPendingImages(current)) {
          const changes = { faviconUrl: saved.faviconUrl, imageUrl: saved.imageUrl };
          patchState(store, updateEntity({ id, changes }), { recent: mapRecent(id, changes) });
        } else if (current !== undefined && hasPendingImages(current)) {
          // Edited to another page while the request ran: that version is pending in its own right.
          captureRequested.delete(id);
          noteLinks([current]);
        }
        // Done (or superseded): a later edit that makes the link pending again may ask again.
        captureRequested.delete(id);
      } catch {
        // No toast: the capture is a courtesy, the card falls back to the site letter.
      }
    }

    function restore(id: string): void {
      const removal = pending.get(id);
      if (!removal) {
        return;
      }
      pending.delete(id);
      patchState(store, setAllEntities(insertAt(store.entities(), removal.index, removal.link)));
      if (removal.recentIndex >= 0) {
        patchState(store, {
          recent: insertAt(store.recent(), removal.recentIndex, removal.link),
        });
      }
    }

    async function commitRemove(id: string): Promise<boolean> {
      const removal = pending.get(id);
      if (!removal || removal.committing) {
        return true;
      }
      removal.committing = true;
      try {
        await firstValueFrom(api().remove(id));
        pending.delete(id);
        return true;
      } catch {
        restore(id);
        return false;
      }
    }

    const setFilter = rxMethod<LinksFilter>(
      pipe(
        tap((filter) => {
          generation++;
          const changed = !sameFilter(filter, store.filter());
          patchState(
            store,
            { filter, loading: true, loadingMore: false, error: false, loadMoreFailed: false },
            changed ? removeAllEntities() : {},
            changed ? { loaded: false, nextCursor: null } : {},
          );
        }),
        switchMap((filter) => {
          const started = epoch;
          return api()
            .list(linksQuery(filter))
            .pipe(
              tap((page) => {
                if (started === epoch) {
                  patchState(
                    store,
                    setAllEntities(page.items.filter((link) => !pending.has(link.id))),
                    { nextCursor: page.nextCursor, loaded: true, loading: false },
                  );
                  noteLinks(page.items);
                }
              }),
              catchError(() => {
                if (started === epoch) {
                  patchState(store, { loading: false, error: true });
                }
                return EMPTY;
              }),
            );
        }),
      ),
    );

    return {
      /** Loads page one of a scope, cancelling a request still running for the previous one. */
      setFilter,

      /** Reloads page one of the current scope after links came back (a Trash restore). Only once loaded. */
      refresh(): void {
        if (store.loaded()) {
          setFilter(store.filter());
        }
      },

      /** Loads the next page; does nothing while a request runs or on the last page. */
      async loadMore(): Promise<void> {
        const cursor = store.nextCursor();
        if (cursor === null || store.loading() || store.loadingMore()) {
          return;
        }
        const started = generation;
        patchState(store, { loadingMore: true, loadMoreFailed: false });
        try {
          const page = await firstValueFrom(api().list(linksQuery(store.filter(), cursor)));
          if (started !== generation) {
            return;
          }
          patchState(store, addEntities(page.items.filter((link) => !pending.has(link.id))), {
            nextCursor: page.nextCursor,
            loadingMore: false,
          });
          noteLinks(page.items);
        } catch {
          if (started === generation) {
            patchState(store, { loadingMore: false, loadMoreFailed: true });
          }
        }
      },

      /** Flips the favorite flag at once; resolves false (and rolls back) when the request fails. */
      async toggleFavorite(id: string): Promise<boolean> {
        const link = store.entityMap()[id];
        if (!link || favoriteBusy.has(id)) {
          return true;
        }
        favoriteBusy.add(id);
        const next = !link.isFavorite;
        patchState(store, updateEntity({ id, changes: { isFavorite: next } }), {
          recent: mapRecent(id, { isFavorite: next }),
        });
        try {
          const saved = await firstValueFrom(api().update(id, { isFavorite: next }));
          patchState(store, updateEntity({ id, changes: { updatedAt: saved.updatedAt } }));
          return true;
        } catch {
          patchState(store, updateEntity({ id, changes: { isFavorite: link.isFavorite } }), {
            recent: mapRecent(id, { isFavorite: link.isFavorite }),
          });
          return false;
        } finally {
          favoriteBusy.delete(id);
        }
      },

      /**
       * Puts a link the server changed (the edit dialog) into the feed and the recent list; a link
       * that no longer matches the open scope leaves the feed.
       */
      applyEdit(link: LinkResponse): void {
        if (store.entityMap()[link.id]) {
          patchState(
            store,
            staysAfterEdit(store.filter(), link) ? setEntity(link) : removeEntity(link.id),
          );
        }
        patchState(store, { recent: mapRecent(link.id, link) });
        noteLinks([link]);
      },

      /** Shows a link that was just saved at the top, when it belongs to the current scope. */
      addSaved(link: LinkResponse): void {
        const { sort, order } = store.filter();
        // At the top only in the default order; other orders show it on the next load.
        const newestFirst = (sort ?? LINK_SORT_FIELD.CreatedAt) === LINK_SORT_FIELD.CreatedAt;
        const descending = (order ?? SORT_ORDER.Desc) === SORT_ORDER.Desc;
        if (
          !store.loaded() ||
          !newestFirst ||
          !descending ||
          !inFilter(store.filter(), link) ||
          store.entityMap()[link.id]
        ) {
          return;
        }
        patchState(store, setAllEntities([link, ...store.entities()]));
      },

      /**
       * A folder subtree was deleted on the server: its links leave the loaded lists
       * (`delete-links`) or become unsorted (`move-to-unsorted`).
       */
      applyFolderRemoval(folderIds: readonly string[], mode: FolderDeleteMode): void {
        const folders = new Set(folderIds);
        const inFolders = (link: LinkResponse): boolean =>
          link.folderId !== null && folders.has(link.folderId);
        // Links in their Undo window follow too, so Undo cannot bring back a deleted link or a
        // stale folder. One already being sent is left alone.
        for (const [id, removal] of pending) {
          if (inFolders(removal.link) && !removal.committing) {
            if (mode === FOLDER_DELETE_MODE.DeleteLinks) {
              pending.delete(id);
            } else {
              pending.set(id, { ...removal, link: { ...removal.link, folderId: null } });
            }
          }
        }
        if (mode === FOLDER_DELETE_MODE.DeleteLinks) {
          patchState(store, setAllEntities(store.entities().filter((link) => !inFolders(link))), {
            recent: store.recent().filter((link) => !inFolders(link)),
          });
          return;
        }
        const unsort = (link: LinkResponse): LinkResponse =>
          inFolders(link) ? { ...link, folderId: null } : link;
        patchState(store, setAllEntities(store.entities().map(unsort)), {
          recent: store.recent().map(unsort),
        });
      },

      /**
       * A tag was renamed or merged on the server: the loaded links, the recent list and links in
       * their Undo window carry the new name (a link that has both collapses to one).
       */
      renameTag(from: string, to: string): void {
        const retag = (link: LinkResponse): LinkResponse => retagLink(link, from, to);
        for (const [id, removal] of pending) {
          if (!removal.committing) {
            pending.set(id, { ...removal, link: retag(removal.link) });
          }
        }
        patchState(store, setAllEntities(store.entities().map(retag)), {
          recent: store.recent().map(retag),
        });
      },

      /** A tag was deleted on the server: it leaves every loaded link, also those in their Undo window. */
      dropTag(name: string): void {
        const drop = (link: LinkResponse): LinkResponse => retagLink(link, name, null);
        for (const [id, removal] of pending) {
          if (!removal.committing) {
            pending.set(id, { ...removal, link: drop(removal.link) });
          }
        }
        patchState(store, setAllEntities(store.entities().map(drop)), {
          recent: store.recent().map(drop),
        });
      },

      /** Hides a link while its Undo window is open. Returns false when it is not in the feed. */
      remove(id: string): boolean {
        const index = store.entities().findIndex((link) => link.id === id);
        const link = store.entities()[index];
        if (!link || pending.has(id)) {
          return false;
        }
        const recentIndex = store.recent().findIndex((item) => item.id === id);
        pending.set(id, { link, index, recentIndex, committing: false });
        patchState(store, removeEntity(id), {
          recent: store.recent().filter((item) => item.id !== id),
        });
        return true;
      },

      /** Brings a hidden link back where it was. */
      undoRemove: restore,

      /** Sends the delete; resolves false (and brings the link back) when it fails. */
      commitRemove,

      /** Sends every delete still waiting (page hide, sign-out). */
      // A delete that is already committing is not awaited: its request went out while the
      // session was valid.
      async flushPending(): Promise<void> {
        await Promise.all([...pending.keys()].map((id) => commitRemove(id)));
      },

      /** Records an open: the link moves to the top of "Recently opened". Failures are ignored. */
      async recordOpen(id: string): Promise<void> {
        const started = epoch;
        try {
          const opened = await firstValueFrom(api().open(id));
          if (started !== epoch) {
            return;
          }
          patchState(store, updateEntity({ id, changes: { lastOpenedAt: opened.lastOpenedAt } }), {
            recent: [opened, ...store.recent().filter((link) => link.id !== id)].slice(
              0,
              RECENT_LINKS_LIMIT,
            ),
          });
        } catch {
          // The link already opened; the panel catches up on the next load.
        }
      },

      /**
       * Takes a link out of the history at once (the link stays saved); resolves false (and puts it
       * back) when the request fails.
       */
      async removeFromHistory(id: string): Promise<boolean> {
        const recentIndex = store.recent().findIndex((link) => link.id === id);
        const link = store.recent()[recentIndex];
        if (!link) {
          return true;
        }
        const started = epoch;
        patchState(store, {
          recent: store.recent().filter((item) => item.id !== id),
        });
        if (store.entityMap()[id]) {
          patchState(store, updateEntity({ id, changes: { lastOpenedAt: null } }));
        }
        try {
          await firstValueFrom(api().removeRecent(id));
          return true;
        } catch {
          if (started === epoch) {
            if (!store.recent().some((item) => item.id === id)) {
              patchState(store, { recent: insertAt(store.recent(), recentIndex, link) });
            }
            if (store.entityMap()[id]) {
              patchState(store, updateEntity({ id, changes: { lastOpenedAt: link.lastOpenedAt } }));
            }
          }
          return false;
        }
      },

      /** Clears the history at once; resolves false (and brings it back) when the request fails. */
      async clearHistory(): Promise<boolean> {
        const started = epoch;
        const previous = store.recent();
        const opened = new Map(
          store
            .entities()
            .filter((link) => link.lastOpenedAt !== null)
            .map((link) => [link.id, link.lastOpenedAt] as const),
        );
        patchState(
          store,
          { recent: [] },
          setAllEntities(
            store
              .entities()
              .map((link) => (opened.has(link.id) ? { ...link, lastOpenedAt: null } : link)),
          ),
        );
        try {
          await firstValueFrom(api().clearRecent());
          return true;
        } catch {
          if (started === epoch) {
            const newer = store.recent().map((link) => link.id);
            patchState(
              store,
              {
                recent: [...store.recent(), ...previous.filter((link) => !newer.includes(link.id))],
              },
              setAllEntities(
                store
                  .entities()
                  .map((link) =>
                    opened.has(link.id)
                      ? { ...link, lastOpenedAt: link.lastOpenedAt ?? opened.get(link.id) ?? null }
                      : link,
                  ),
              ),
            );
          }
          return false;
        }
      },

      async loadRecent(): Promise<void> {
        const started = epoch;
        try {
          const { items } = await firstValueFrom(api().recent({ limit: RECENT_LINKS_LIMIT }));
          if (started === epoch) {
            patchState(store, {
              recent: items.filter((link) => !pending.has(link.id)),
              recentLoaded: true,
            });
            noteLinks(items);
          }
        } catch {
          if (started === epoch) {
            patchState(store, { recentLoaded: true });
          }
        }
      },

      /**
       * Sign-out: forgets everything of this user and drops responses still in flight. Call
       * `flushPending()` first (and await it) while the session is still valid; deletes left
       * here are not sent.
       */
      reset(): void {
        pending.clear();
        favoriteBusy.clear();
        captureRequested.clear();
        captureQueue.length = 0;
        generation++;
        epoch++;
        patchState(store, initialState, removeAllEntities());
      },
    };
  }),
  withHooks({
    onInit(store) {
      // The page is going away: the real `HttpClient` implementation (issue #72) must send these
      // deletes with `fetch(..., { keepalive: true })` or `navigator.sendBeacon`, or they are lost.
      inject(DOCUMENT).defaultView?.addEventListener('pagehide', () => {
        void store.flushPending();
      });
    },
  }),
);
