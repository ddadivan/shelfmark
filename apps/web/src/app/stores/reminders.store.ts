import { computed, inject, Injector } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { LinkResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { REMINDERS_API } from '../features/reminders/models/reminders-api.const';
import { followLinkChanges } from './follow-link-changes';
import { LinksStore } from './links.store';
import type { LinkChange } from './models/link-change.interface';
import type { RemindersState } from './models/reminders-state.interface';

const initialState: RemindersState = {
  due: [],
  upcoming: [],
  dueCount: 0,
  countLoaded: false,
  loaded: false,
  loading: false,
  error: false,
};

/** Soonest first, then by id: the order of the API lists. */
function bySoonest(a: LinkResponse, b: LinkResponse): number {
  return (a.remindAt ?? '').localeCompare(b.remindAt ?? '') || a.id.localeCompare(b.id);
}

/**
 * Reminders for the whole app (#275): the due count of the sidebar badge and, once the Reminders
 * page or the app-open check asked for it, the due and upcoming lists. Due-ness comes from the
 * server (`remindAt` has passed). A write (set, change, clear, snooze, bulk) answers the changed
 * links, which go into the lists and the feed at once; the session end forgets everything and drops
 * answers still in flight.
 */
export const RemindersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ due, upcoming }) => ({
    /** Due and upcoming links, for a quick lookup by id. */
    byId: computed(() => new Map([...due(), ...upcoming()].map((link) => [link.id, link]))),
  })),
  withMethods((store) => {
    // Resolved on use: specs of pages that never touch reminders provide no `REMINDERS_API`.
    const injector = inject(Injector);
    const api = () => injector.get(REMINDERS_API);
    let epoch = 0;
    let listSeq = 0;
    let firstLoad: Promise<void> | null = null;

    inject(SessionScope).onEnd(() => {
      epoch++;
      listSeq++;
      firstLoad = null;
      patchState(store, initialState);
    });

    async function fetchList(): Promise<void> {
      const started = epoch;
      const seq = ++listSeq;
      if (!store.loaded()) {
        patchState(store, { loading: true, error: false });
      }
      try {
        const { due, upcoming } = await firstValueFrom(api().list());
        if (started !== epoch || seq !== listSeq) {
          return;
        }
        patchState(store, {
          due,
          upcoming,
          dueCount: due.length,
          countLoaded: true,
          loaded: true,
          loading: false,
          error: false,
        });
      } catch {
        if (started === epoch && seq === listSeq) {
          patchState(store, { loading: false, error: !store.loaded() });
        }
      }
    }

    async function fetchCount(): Promise<void> {
      const started = epoch;
      try {
        const { due } = await firstValueFrom(api().count());
        if (started === epoch) {
          patchState(store, { dueCount: due, countLoaded: true });
        }
      } catch {
        // The badge stays as it was; the next refresh tries again.
      }
    }

    /** Whether a link's reminder has come at `now` (ISO). */
    const isDue = (link: LinkResponse, now: string): boolean =>
      link.remindAt !== null && link.remindAt <= now;

    /**
     * Puts changed links into the lists (or out of them) and the feed. `before` are the same links
     * as they were, so the badge moves right even when the lists were never loaded.
     */
    function apply(links: readonly LinkResponse[], before: readonly LinkResponse[]): void {
      if (links.length === 0) {
        return;
      }
      injector.get(LinksStore).patchLinks(links);
      const changed = new Set(links.map((link) => link.id));
      const now = new Date().toISOString();
      const keep = (list: readonly LinkResponse[]) => list.filter((link) => !changed.has(link.id));
      const set = links.filter((link) => link.remindAt !== null);
      const due = [...keep(store.due()), ...set.filter((link) => isDue(link, now))];
      const upcoming = [...keep(store.upcoming()), ...set.filter((link) => !isDue(link, now))];
      const dueChange =
        links.filter((link) => isDue(link, now)).length -
        before.filter((link) => isDue(link, now)).length;
      patchState(store, {
        due: due.sort(bySoonest),
        upcoming: upcoming.sort(bySoonest),
        // Without the lists, the count moves by what this change made due or not due.
        dueCount: store.loaded() ? due.length : Math.max(0, store.dueCount() + dueChange),
      });
    }

    // Links a delete took out of the lists, so their Undo puts them back.
    const gone = new Map<string, LinkResponse>();

    /**
     * Follows what `LinksStore` wrote (an edit, a star, a delete and its Undo): a listed link takes
     * its new state (it leaves when its reminder is gone and changes list when it came due or was
     * snoozed), a removed one leaves, and a restored one with a reminder comes back. Links with a
     * new reminder are added by `apply`, which also keeps the badge when the lists are not loaded.
     */
    function follow(change: LinkChange): void {
      if (!store.loaded()) {
        return;
      }
      const written = new Map((change.upserted ?? []).map((link) => [link.id, link]));
      const removed = new Set(change.removed ?? []);
      if (written.size === 0 && removed.size === 0) {
        return;
      }
      const listed = store.byId();
      const relevant =
        [...written.keys()].some((id) => listed.has(id) || gone.has(id)) ||
        [...removed].some((id) => listed.has(id));
      if (!relevant) {
        return;
      }
      for (const id of removed) {
        const link = listed.get(id);
        if (link) {
          gone.set(id, link);
        }
      }
      const now = new Date().toISOString();
      const rest = (list: readonly LinkResponse[]) =>
        list.filter((link) => !written.has(link.id) && !removed.has(link.id));
      const back = [...written.values()].filter(
        (link) => link.remindAt !== null && (listed.has(link.id) || gone.has(link.id)),
      );
      for (const link of back) {
        gone.delete(link.id);
      }
      const due = [...rest(store.due()), ...back.filter((link) => isDue(link, now))];
      const upcoming = [...rest(store.upcoming()), ...back.filter((link) => !isDue(link, now))];
      patchState(store, {
        due: due.sort(bySoonest),
        upcoming: upcoming.sort(bySoonest),
        dueCount: due.length,
      });
    }

    function load(): Promise<void> {
      if (store.loaded()) {
        return Promise.resolve();
      }
      firstLoad ??= fetchList().finally(() => (firstLoad = null));
      return firstLoad;
    }

    return {
      _follow: follow,

      /** Loads the lists once; later calls reuse the first request. A failure can be retried. */
      load,

      /** The badge: asks for the due count (cheap), once per call. */
      loadCount: (): Promise<void> => fetchCount(),

      /** Opening the page: reloads the lists (the old ones stay meanwhile). */
      open: (): Promise<void> => (store.loaded() ? fetchList() : load()),

      /** Something changed elsewhere (another tab, a delete, a restore): the lists or the count again. */
      refresh: (): Promise<void> => (store.loaded() ? fetchList() : fetchCount()),

      /**
       * Sets (`remindAt`) or clears (`null`) the reminder of the links; resolves `false` when the
       * request failed (nothing changed, the caller toasts).
       */
      async set(links: readonly LinkResponse[], remindAt: string | null): Promise<boolean> {
        if (links.length === 0) {
          return true;
        }
        const started = epoch;
        try {
          let changed: LinkResponse[];
          const [only] = links;
          if (links.length === 1 && only) {
            if (remindAt === null) {
              await firstValueFrom(api().clear(only.id));
              changed = [{ ...only, remindAt: null }];
            } else {
              changed = [await firstValueFrom(api().set(only.id, remindAt))];
            }
          } else {
            const ids = links.map((link) => link.id);
            changed = (await firstValueFrom(api().setMany({ ids, remindAt }))).links;
          }
          if (started === epoch) {
            apply(changed, links);
          }
          return true;
        } catch {
          return false;
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      followLinkChanges((change) => store._follow(change));
    },
  }),
);
