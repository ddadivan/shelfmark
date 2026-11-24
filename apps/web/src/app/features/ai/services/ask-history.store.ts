import { computed, effect, inject, untracked } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { ASK_HISTORY_API } from '../models/ask-history-api.const';
import type { AskHistoryGroup } from '../models/ask-history-group.interface';
import type { AskHistoryState } from '../models/ask-history-state.interface';
import { AskHistoryChanges } from './ask-history-changes.service';

const initialState: AskHistoryState = {
  items: [],
  nextCursor: null,
  loading: false,
  loaded: false,
  failed: false,
};

/** Start of the local day of `now`, in ms. */
function startOfDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * The Ask conversation list (Shelf 11-ask "Kept on your account"), root: read from
 * `ASK_HISTORY_API` when a list first shows, read again when `AskHistoryChanges` says a turn was
 * stored, forgotten when the session ends. `remove` and `clear` change the server and the list.
 */
export const AskHistoryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withProps(() => ({
    _api: inject(ASK_HISTORY_API),
    _changes: inject(AskHistoryChanges),
  })),
  withComputed(({ items }) => ({
    /** Today and Earlier, newest first; empty sections are left out. */
    groups: computed<AskHistoryGroup[]>(() => {
      const today = startOfDay(new Date());
      const recent = items().filter((item) => Date.parse(item.updatedAt) >= today);
      const earlier = items().filter((item) => Date.parse(item.updatedAt) < today);
      return [
        { labelKey: 'ai.ask.history.today', items: recent },
        { labelKey: 'ai.ask.history.earlier', items: earlier },
      ].filter((group) => group.items.length > 0);
    }),
  })),
  withMethods((store) => {
    let generation = 0;
    const read = async (append: boolean): Promise<void> => {
      const mine = ++generation;
      patchState(store, { loading: true });
      try {
        const page = await firstValueFrom(
          store._api.list(append ? (store.nextCursor() ?? undefined) : undefined),
        );
        if (mine !== generation) return;
        patchState(store, {
          items: append ? [...store.items(), ...page.items] : page.items,
          nextCursor: page.nextCursor,
          loading: false,
          loaded: true,
          failed: false,
        });
      } catch {
        if (mine !== generation) return;
        patchState(store, { loading: false, loaded: true, failed: true });
      }
    };
    return {
      /** Reads the first page (again). */
      load: (): Promise<void> => read(false),
      /** Reads the next page, when there is one. */
      async loadMore(): Promise<void> {
        if (store.nextCursor() !== null && !store.loading()) {
          await read(true);
        }
      },
      /** Deletes one conversation; answers whether the server did. */
      async remove(id: string): Promise<boolean> {
        try {
          await firstValueFrom(store._api.remove(id));
        } catch {
          return false;
        }
        patchState(store, { items: store.items().filter((item) => item.id !== id) });
        return true;
      },
      /** "Clear all"; answers whether the server did. */
      async clear(): Promise<boolean> {
        try {
          await firstValueFrom(store._api.clear());
        } catch {
          return false;
        }
        generation++;
        patchState(store, { items: [], nextCursor: null, loaded: true, failed: false });
        return true;
      },
      /** Forgets the list (the session ended). */
      reset(): void {
        generation++;
        patchState(store, initialState);
      },
    };
  }),
  withHooks({
    onInit(store) {
      inject(SessionScope).onEnd(() => store.reset());
      // A stored turn (or a delete elsewhere) reads the list again once it was shown.
      effect(() => {
        store._changes.version();
        untracked(() => {
          if (store.loaded()) void store.load();
        });
      });
    },
  }),
);
