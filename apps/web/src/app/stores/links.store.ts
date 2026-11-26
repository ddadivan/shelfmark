import { DOCUMENT } from '@angular/common';
import { computed, inject, Injector } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
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
import { catchError, EMPTY, firstValueFrom, pipe, Subject, switchMap, tap } from 'rxjs';
import { inFilter, linksQuery, sameFilter } from '../features/links/utils/links-filter';
import { LINKS_API } from '../features/links/models/links-api.const';
import type { LinksFilter } from '../features/links/models/links-filter.type';
import { LINKS_SCOPE } from '../features/links/models/links-scope.const';
import type { PendingRemoval } from '../features/links/models/pending-removal.interface';
import { RECENT_LINKS_LIMIT } from '../features/links/models/recent-links-limit.const';
import type { LinkChange } from './models/link-change.interface';
import type { LinksSnapshot } from './models/links-snapshot.interface';
import type { LinksState } from './models/links-state.interface';
import { createLinkImageCapture } from './link-image-capture';
import { insertAt, placeLink, retagLink, staysAfterEdit, takesNewcomers } from './links-feed';
import { PinsStore } from './pins.store';
import { SessionScope } from '../core/auth/session-scope.service';

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
  landed: {},
};

/** How long a just-saved link keeps its `landed` mark: the land, the 1.8 s ring and the stagger. */
const LANDED_MS = 2600;
/** At most this many cards are staggered; later ones land with the last of them. */
const LANDED_STAGGER_MAX = 10;

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
  withProps(() => {
    const changes = new Subject<LinkChange>();
    return {
      _changes: changes,
      /**
       * What each write changed, whether or not the link is loaded here (ADR 0044): the right half
       * of the side-by-side view follows it.
       */
      linkChanges: changes.asObservable(),
    };
  }),
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
    const favoriteBusy = new Map<string, Promise<void>>();
    // Feed slots of links a move took out of the open scope, so moving them back restores the slot.
    const movedFrom = new Map<string, number>();
    // Links an unstar took out of the open feed (Favorites, an "only favorites" view) and their
    // slots, so starring them again (the toast's Undo) puts them back where they were.
    const unstarred = new Map<string, { link: LinkResponse; index: number }>();
    // Bumped when the filter changes or the store resets: late responses are dropped.
    let generation = 0;
    // Bumped only by `reset()`: a response that started before it belongs to the previous user.
    let epoch = 0;

    function mapRecent(id: string, changes: Partial<LinkResponse>): LinkResponse[] {
      return store.recent().map((link) => (link.id === id ? { ...link, ...changes } : link));
    }

    function loaded(id: string): LinkResponse | undefined {
      return store.entityMap()[id] ?? store.recent().find((link) => link.id === id);
    }

    const capture = createLinkImageCapture({
      request: (id) => firstValueFrom(api().captureImages(id)),
      current: loaded,
      isHidden: (id) => pending.has(id),
      epoch: () => epoch,
      apply: (id, changes) =>
        patchState(store, updateEntity({ id, changes }), { recent: mapRecent(id, changes) }),
    });

    /** Marks just-saved links for the landing motion and drops the marks once it has played. */
    function markLanded(ids: readonly string[]): void {
      if (ids.length === 0) {
        return;
      }
      const marks: Record<string, number> = { ...store.landed() };
      ids.forEach((id, index) => {
        marks[id] = Math.min(index, LANDED_STAGGER_MAX);
      });
      patchState(store, { landed: marks });
      const started = epoch;
      setTimeout(() => {
        if (started !== epoch) {
          return;
        }
        const rest: Record<string, number> = { ...store.landed() };
        for (const id of ids) {
          delete rest[id];
        }
        patchState(store, { landed: rest });
      }, LANDED_MS);
    }

    /** Whether a new link goes on top of the open feed: loaded, newest first, in scope, not shown yet. */
    function showsOnTop(link: LinkResponse): boolean {
      const { sort, order } = store.filter();
      // At the top only in the default order; other orders show it on the next load.
      const newestFirst = (sort ?? LINK_SORT_FIELD.CreatedAt) === LINK_SORT_FIELD.CreatedAt;
      const descending = (order ?? SORT_ORDER.Desc) === SORT_ORDER.Desc;
      return (
        store.loaded() &&
        newestFirst &&
        descending &&
        inFilter(store.filter(), link) &&
        !store.entityMap()[link.id]
      );
    }

    function publish(change: LinkChange): void {
      store._changes.next(change);
    }

    /**
     * Shows `link` with its new folder (`placeLink`): kept in place while it still belongs to the
     * open scope, removed (remembering its slot) when it no longer does, put back at its slot
     * when it belongs again. The recent list only takes the new folder. A `rollback` only puts a
     * link back where it was: it never inserts a link the feed did not hold, and is no move.
     */
    function placeMoved(link: LinkResponse, rollback = false): void {
      if (store.loaded()) {
        patchState(
          store,
          setAllEntities([
            ...placeLink(
              store.entities(),
              store.filter(),
              link,
              movedFrom,
              !rollback && takesNewcomers(store.filter(), store.hasMore()),
            ),
          ]),
        );
      }
      patchState(store, { recent: mapRecent(link.id, { folderId: link.folderId }) });
      publish(rollback ? { upserted: [link] } : { upserted: [link], moved: true });
    }

    function restore(id: string): void {
      const removal = pending.get(id);
      if (!removal) {
        return;
      }
      pending.delete(id);
      const { link } = removal;
      // The slot only means something in the feed it was taken from: after another feed was
      // opened the link is put back there only when it belongs, through a reload.
      const sameFeed = removal.generation === generation;
      if (sameFeed && removal.index >= 0 && !store.entityMap()[id]) {
        patchState(store, setAllEntities(insertAt(store.entities(), removal.index, link)));
      } else if (
        !sameFeed &&
        store.loaded() &&
        !store.entityMap()[id] &&
        inFilter(store.filter(), link)
      ) {
        setFilter(store.filter());
      }
      publish({ upserted: [link], moved: true });
      if (removal.recentIndex >= 0 && !store.recent().some((item) => item.id === id)) {
        patchState(store, {
          recent: insertAt(store.recent(), removal.recentIndex, link),
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

    async function loadRecent(): Promise<void> {
      const started = epoch;
      try {
        const { items } = await firstValueFrom(api().recent({ limit: RECENT_LINKS_LIMIT }));
        if (started === epoch) {
          patchState(store, {
            recent: items.filter((link) => !pending.has(link.id)),
            recentLoaded: true,
          });
          capture.note(items);
        }
      } catch {
        if (started === epoch) {
          patchState(store, { recentLoaded: true });
        }
      }
    }

    /** The link as the store knows it (feed, left by an unstar, recent), else the caller's. */
    function knownLink(id: string, hint?: LinkResponse): LinkResponse | undefined {
      return store.entityMap()[id] ?? unstarred.get(id)?.link ?? loaded(id) ?? hint;
    }

    /** Resolves once no favorite request of the link is running (new ones may queue meanwhile). */
    async function favoriteIdle(id: string): Promise<void> {
      for (let busy = favoriteBusy.get(id); busy; busy = favoriteBusy.get(id)) {
        await busy;
      }
    }

    /** Runs `change` at once when no favorite request of the link runs, else after it. */
    function afterFavorite(id: string, change: () => Promise<boolean>): Promise<boolean> {
      return favoriteBusy.has(id) ? favoriteIdle(id).then(change) : change();
    }

    function applyFavorite(
      id: string,
      next: boolean,
      hint: LinkResponse | undefined,
      rejoin: boolean,
    ): Promise<boolean> {
      const request = runFavorite(id, next, hint, rejoin);
      const busy = request.then(() => {
        if (favoriteBusy.get(id) === busy) {
          favoriteBusy.delete(id);
        }
      });
      favoriteBusy.set(id, busy);
      return request;
    }

    async function runFavorite(
      id: string,
      next: boolean,
      hint: LinkResponse | undefined,
      rejoin: boolean,
    ): Promise<boolean> {
      const away = unstarred.get(id);
      const held = store.entityMap()[id] ?? away?.link ?? loaded(id);
      const link = held ?? hint;
      // Nothing known, or the link already has the value (a link known only from the caller's
      // copy may be out of date, so that one is sent anyway).
      if (!link || (held && held.isFavorite === next)) {
        return true;
      }
      const changed: LinkResponse = { ...link, isFavorite: next };
      const index = store.ids().indexOf(id);
      const inFeed = index >= 0;
      const leaves = inFeed && store.loaded() && !inFilter(store.filter(), changed);
      const rejoins =
        !inFeed && !away && rejoin && next && store.loaded() && inFilter(store.filter(), changed);
      const slot = away && next ? away.index : rejoins ? 0 : -1;
      const returns = slot >= 0 && !inFeed;
      if (returns) {
        unstarred.delete(id);
        patchState(store, setAllEntities(insertAt(store.entities(), slot, changed)));
      } else if (leaves) {
        unstarred.set(id, { link: changed, index });
        patchState(store, removeEntity(id));
      } else {
        patchState(store, updateEntity({ id, changes: { isFavorite: next } }));
      }
      patchState(store, { recent: mapRecent(id, { isFavorite: next }) });
      publish({ upserted: [changed] });
      try {
        const saved = await firstValueFrom(api().update(id, { isFavorite: next }));
        if (store.entityMap()[id]) {
          patchState(store, updateEntity({ id, changes: { updatedAt: saved.updatedAt } }));
        }
        return true;
      } catch {
        if (returns) {
          if (away) {
            unstarred.set(id, away);
          }
          patchState(store, removeEntity(id));
        } else if (leaves) {
          unstarred.delete(id);
          patchState(store, setAllEntities(insertAt(store.entities(), index, link)));
        } else {
          patchState(store, updateEntity({ id, changes: { isFavorite: link.isFavorite } }));
        }
        patchState(store, { recent: mapRecent(id, { isFavorite: link.isFavorite }) });
        publish({ upserted: [link] });
        return false;
      }
    }

    const setFilter = rxMethod<LinksFilter>(
      pipe(
        tap((filter) => {
          generation++;
          movedFrom.clear();
          unstarred.clear();
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
                    // The pinned links of a folder come first; the rest follow in the sort order.
                    setAllEntities(
                      [...page.pinned, ...page.items].filter((link) => !pending.has(link.id)),
                    ),
                    { nextCursor: page.nextCursor, loaded: true, loading: false },
                  );
                  capture.note(page.items);
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

      /**
       * Pins a link to the top of its folder (or takes it off) at once; resolves false (and puts
       * the old state back) when the request fails. After an unpin the page is loaded again, so
       * the link finds its place in the sort order.
       */
      async setPinnedInFolder(id: string, pinned: boolean): Promise<boolean> {
        const link = store.entityMap()[id];
        if (!link || (link.pinnedInFolderAt !== null) === pinned) {
          return true;
        }
        const previous = link.pinnedInFolderAt;
        const optimistic = pinned ? new Date().toISOString() : null;
        const started = epoch;
        patchState(store, updateEntity({ id, changes: { pinnedInFolderAt: optimistic } }));
        try {
          const saved = await firstValueFrom(api().update(id, { pinnedInFolder: pinned }));
          if (started === epoch) {
            patchState(
              store,
              updateEntity({
                id,
                changes: { pinnedInFolderAt: saved.pinnedInFolderAt, updatedAt: saved.updatedAt },
              }),
            );
            if (!pinned && store.loaded()) {
              setFilter(store.filter());
            }
          }
          return true;
        } catch {
          if (started === epoch && store.entityMap()[id]?.pinnedInFolderAt === optimistic) {
            patchState(store, updateEntity({ id, changes: { pinnedInFolderAt: previous } }));
          }
          return false;
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
          capture.note(page.items);
        } catch {
          if (started === generation) {
            patchState(store, { loadingMore: false, loadMoreFailed: true });
          }
        }
      },

      /**
       * Flips the favorite flag at once; resolves false (and rolls back) when the request fails.
       * `hint` is the link as the caller shows it, for a link the feed and the recent list do not
       * hold. A request still running for the link is awaited first.
       */
      toggleFavorite(id: string, hint?: LinkResponse): Promise<boolean> {
        return afterFavorite(id, async () => {
          const link = knownLink(id, hint);
          return link ? applyFavorite(id, !link.isFavorite, hint, false) : true;
        });
      },

      /**
       * Stars or unstars a link at once, to an explicit value (idempotent: a link that already
       * has it is left alone). A link the change takes out of
       * the open feed (unstarred in Favorites or an "only favorites" view) leaves it, remembering
       * its slot; starring it again puts it back there. With `rejoin` (Undo of an unstar) a link
       * the feed no longer holds and that belongs to it goes back in at the top. A failure puts
       * everything back. A request still running for the link is awaited first.
       */
      setFavorite(
        id: string,
        value: boolean,
        hint?: LinkResponse,
        options: { readonly rejoin?: boolean } = {},
      ): Promise<boolean> {
        return afterFavorite(id, async () =>
          applyFavorite(id, value, hint, options.rejoin === true),
        );
      },

      /** Whether the last unstar took this link out of the open feed (its toast offers Undo). */
      leftByUnstar(id: string): boolean {
        return unstarred.has(id);
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
        publish({ upserted: [link] });
        capture.note([link]);
      },

      /** Shows a link that was just saved at the top, when it belongs to the current scope. */
      addSaved(link: LinkResponse): void {
        publish({ upserted: [link], moved: true });
        if (!showsOnTop(link)) {
          return;
        }
        patchState(store, setAllEntities([link, ...store.entities()]));
        markLanded([link.id]);
      },

      /**
       * Shows links saved together (paste many) at the top in the order they were pasted, each
       * landing a beat after the one before, and starts the capture of their pending images and
       * titles.
       */
      addSavedMany(links: readonly LinkResponse[]): void {
        publish({ upserted: links, moved: true });
        const shown = links.filter((link) => showsOnTop(link));
        if (shown.length > 0) {
          patchState(store, setAllEntities([...shown, ...store.entities()]));
          markLanded(shown.map((link) => link.id));
        }
        capture.note(links);
      },

      /** Takes links out of the feed and the recent list at once (Undo of a batch save). */
      dropSaved(ids: readonly string[]): void {
        publish({ removed: ids });
        const gone = new Set(ids);
        patchState(store, setAllEntities(store.entities().filter((link) => !gone.has(link.id))), {
          recent: store.recent().filter((link) => !gone.has(link.id)),
        });
      },

      /**
       * A folder subtree was deleted on the server: its links leave the loaded lists
       * (`delete-links`) or become unsorted (`move-to-unsorted`).
       */
      applyFolderRemoval(folderIds: readonly string[], mode: FolderDeleteMode): void {
        publish({ reload: true });
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
        publish({ reload: true });
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
        publish({ reload: true });
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

      /** Another tab deleted the link (tab sync): it leaves the feed and the recent list. */
      applyRemoval(id: string): void {
        if (pending.has(id)) {
          return;
        }
        publish({ removed: [id] });
        patchState(store, removeEntity(id), {
          recent: store.recent().filter((item) => item.id !== id),
        });
      },

      /** Loads the open feed and the recent list again, keeping what shows meanwhile (tab sync). */
      refresh(): void {
        publish({ reload: true });
        if (store.loaded()) {
          setFilter(store.filter());
        }
        if (store.recentLoaded()) {
          void loadRecent();
        }
      },

      /**
       * Moves a link to another folder (`null` = Unsorted) at once: a link that leaves the open
       * scope leaves the feed, and comes back to its old slot when it is moved back (Undo). Resolves
       * false, with the change rolled back, when the request fails.
       */
      async move(link: LinkResponse, folderId: string | null): Promise<boolean> {
        const current = store.entityMap()[link.id] ?? link;
        if (pending.has(link.id)) {
          // The link is being deleted: moving it now would change a link the user just removed,
          // and a success would be a lie. The caller says it could not move.
          return false;
        }
        if (current.folderId === folderId) {
          return true;
        }
        const startedEpoch = epoch;
        placeMoved({ ...current, folderId });
        try {
          const saved = await firstValueFrom(api().update(link.id, { folderId }));
          if (startedEpoch === epoch && store.entityMap()[link.id]) {
            patchState(
              store,
              updateEntity({ id: link.id, changes: { updatedAt: saved.updatedAt } }),
            );
          }
          if (startedEpoch === epoch) {
            // The other feed's copy gets the server's time too, on top of any change made meanwhile.
            const latest = store.entityMap()[link.id] ?? { ...current, folderId };
            publish({ upserted: [{ ...latest, updatedAt: saved.updatedAt }] });
          }
          return true;
        } catch {
          if (startedEpoch === epoch) {
            placeMoved(current, true);
          }
          return false;
        }
      },

      /** The feed and the recent list as they are, before an optimistic bulk change (#267). */
      snapshot(): LinksSnapshot {
        return { entities: store.entities(), recent: store.recent(), generation, epoch };
      },

      /**
       * Rolls a failed bulk change back, unless the view or the user changed meanwhile. Only the
       * `originals` (the links before the change that failed) are touched, each by id: one that is
       * still shown gets its old self back, one that left is put back at its old slot. Pages
       * loaded since and changes to other links stay. The other feed gets the originals too (it
       * holds no snapshot).
       */
      restoreSnapshot(snapshot: LinksSnapshot, originals: readonly LinkResponse[] = []): void {
        // The other feed has no generation: it takes the originals whatever happened here.
        if (originals.length > 0) {
          publish({ upserted: originals });
        }
        if (snapshot.epoch !== epoch || originals.length === 0) {
          return;
        }
        const back = new Map(originals.map((link) => [link.id, link]));
        const rollBack = (
          current: readonly LinkResponse[],
          before: readonly LinkResponse[],
          keep: (link: LinkResponse) => boolean,
        ): LinkResponse[] => {
          const held = new Set(current.map((link) => link.id));
          const next = current.map((link) => back.get(link.id) ?? link);
          // Links that left come back from the first slot onwards, so each lands where it was.
          before.forEach((link, at) => {
            const original = back.get(link.id);
            if (original && !held.has(link.id) && keep(original)) {
              next.splice(Math.min(at, next.length), 0, original);
            }
          });
          return next;
        };
        if (snapshot.generation === generation) {
          patchState(
            store,
            setAllEntities(
              rollBack(store.entities(), snapshot.entities, (link) => !pending.has(link.id)),
            ),
          );
        }
        patchState(store, {
          recent: rollBack(store.recent(), snapshot.recent, (link) => !pending.has(link.id)),
        });
      },

      /**
       * Links a bulk change touched (optimistic copies or the server's answer): each loaded one is
       * replaced, or leaves the feed when it no longer belongs to the open scope (moved out).
       * `moved` says the change is a move into a folder: the other feed may take such links in.
       */
      patchLinks(links: readonly LinkResponse[], moved = false): void {
        publish(moved ? { upserted: links, moved: true } : { upserted: links });
        const byId = new Map(links.map((link) => [link.id, link]));
        const filter = store.filter();
        patchState(
          store,
          setAllEntities(
            store.entities().flatMap((link) => {
              const next = byId.get(link.id);
              if (!next) {
                return [link];
              }
              return staysAfterEdit(filter, next) ? [next] : [];
            }),
          ),
          { recent: store.recent().map((link) => byId.get(link.id) ?? link) },
        );
        capture.note(links);
      },

      /** Takes links out of the feed and the recent list at once (bulk move to Trash). */
      removeLinks(ids: readonly string[]): void {
        publish({ removed: ids });
        const gone = new Set(ids);
        patchState(store, setAllEntities(store.entities().filter((link) => !gone.has(link.id))), {
          recent: store.recent().filter((link) => !gone.has(link.id)),
        });
      },

      /** Whether a link is in its delete Undo window (hidden, not yet deleted). */
      isPending(id: string): boolean {
        return pending.has(id);
      },

      /**
       * Hides a link while its Undo window is open. The link need not be in the open feed (a
       * search match, a Today or Recently opened card, a preview): `hint` is the one the caller
       * shows. Returns false when the link is unknown or already hidden.
       */
      remove(id: string, hint?: LinkResponse): boolean {
        const index = store.entities().findIndex((link) => link.id === id);
        const link = store.entities()[index] ?? loaded(id) ?? hint;
        if (!link || pending.has(id)) {
          return false;
        }
        const recentIndex = store.recent().findIndex((item) => item.id === id);
        pending.set(id, { link, index, generation, recentIndex, committing: false });
        injector.get(PinsStore).dropLink(id);
        publish({ removed: [id] });
        patchState(store, removeEntity(id), {
          recent: store.recent().filter((item) => item.id !== id),
        });
        return true;
      },

      /** Brings a hidden link back where it was (the server still has its sidebar pin). */
      undoRemove(id: string): void {
        restore(id);
        void injector.get(PinsStore).refresh();
      },

      /** Sends the delete; resolves false (and brings the link back) when it fails. */
      commitRemove,

      /** Ties the Undo toast of a hidden link to it, so a flush can close it. */
      attachUndo(id: string, dismiss: () => void): void {
        const removal = pending.get(id);
        if (removal) {
          removal.dismissUndo = dismiss;
        }
      },

      /**
       * Sends every delete still waiting (opening Trash, page hide, sign-out). Each delete that went
       * through closes its Undo toast: Undo can no longer bring the link back, and the toast must
       * not linger over the next page until its countdown ends.
       */
      // A delete that is already committing is not awaited: its request went out while the
      // session was valid.
      async flushPending(): Promise<void> {
        await Promise.all(
          [...pending.entries()].map(async ([id, removal]) => {
            if ((await commitRemove(id)) && !pending.has(id)) {
              removal.dismissUndo?.();
            }
          }),
        );
      },

      /** Records an open: the link moves to the top of "Recently opened". Failures are ignored. */
      async recordOpen(id: string): Promise<void> {
        const started = epoch;
        try {
          const opened = await firstValueFrom(api().open(id));
          // A paused history (`recorded: false`) leaves the link where it was.
          if (started !== epoch || !opened.recorded) {
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

      loadRecent,

      /**
       * Sign-out: forgets everything of this user and drops responses still in flight. Call
       * `flushPending()` first (and await it) while the session is still valid; deletes left
       * here are not sent.
       */
      reset(): void {
        pending.clear();
        favoriteBusy.clear();
        capture.clear();
        movedFrom.clear();
        generation++;
        epoch++;
        unstarred.clear();
        patchState(store, initialState, removeAllEntities());
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Resolved on use, so a call goes through the store as it is by then.
      const injector = inject(Injector);
      const scope = inject(SessionScope);
      scope.onEnd(() => injector.get(LinksStore).reset());
      scope.beforeEnd(() => injector.get(LinksStore).flushPending());
      // The page is going away: the real `HttpClient` implementation (issue #72) must send these
      // deletes with `fetch(..., { keepalive: true })` or `navigator.sendBeacon`, or they are lost.
      inject(DOCUMENT).defaultView?.addEventListener('pagehide', () => {
        void store.flushPending();
      });
    },
  }),
);
