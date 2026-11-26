import { patchState, signalStoreFeature, type, withMethods } from '@ngrx/signals';
import type { RemoteLoadState } from './models/remote-load-state.type';
import type { SessionLoadOptions } from './models/session-load-options.interface';
import { withSessionLoad } from './with-session-load';

/**
 * A list the store loads from the server and also changes through mutations: the stale-response
 * guard shared by `FoldersStore`, `TagsStore` and `TrashStore`, on top of `withSessionLoad`.
 *
 * A list request that started before a mutation must not overwrite it on arrival. `_begin()` /
 * `_finish(token)` wrap every mutation (they change the version and count the running ones). A
 * list that comes back stale is dropped and asked for again: at once when no mutation is running,
 * else when the last one finishes (`refetchWanted`). A response of a previous user (session end)
 * or of an older request is dropped silently. The first load is shared (`_ensureLoaded`).
 *
 * `read` reads the list, `apply` writes it to the state (throwing there counts as a failed load).
 * Private (`_`) members only: the store's public API is its own.
 */
export function withRemoteLoad(initialState: RemoteLoadState, options: SessionLoadOptions = {}) {
  return signalStoreFeature(
    { state: type<RemoteLoadState>() },
    withSessionLoad<RemoteLoadState>(initialState, options),
    withMethods((store) => {
      let inFlight = 0;
      let refetchWanted = false;
      let lastFetch: (() => Promise<void>) | null = null;

      store._onSessionEnd(() => {
        inFlight = 0;
        refetchWanted = false;
      });

      function fetchAll<R>(read: () => Promise<R>, apply: (response: R) => void): Promise<void> {
        const run = (): Promise<void> => fetchAll(read, apply);
        lastFetch = run;
        return (async () => {
          const started = store._epoch();
          const startedVersion = store._version();
          const seq = store._nextSeq();
          if (!store.loaded()) {
            patchState(store, { loading: true, error: false });
          }
          try {
            const response = await read();
            if (started !== store._epoch() || !store._isNewest(seq)) {
              return;
            }
            if (store._version() !== startedVersion || inFlight > 0) {
              // Stale against a mutation: ask again now, or when the last mutation ends.
              if (inFlight > 0) {
                refetchWanted = true;
                return;
              }
              return run();
            }
            apply(response);
          } catch {
            if (started === store._epoch() && store._isNewest(seq)) {
              patchState(store, { loading: false, error: !store.loaded() });
            }
          }
        })();
      }

      return {
        _fetchAll: fetchAll,
        /** Loads once; callers share the first request; a failure can be retried. */
        _ensureLoaded<R>(read: () => Promise<R>, apply: (response: R) => void): Promise<void> {
          if (store.loaded()) {
            return Promise.resolve();
          }
          return store._dedupe(() => fetchAll(read, apply));
        },
        /** Starts a mutation; the token tells later whether the session ended meanwhile. */
        _begin(): number {
          inFlight++;
          store._bumpVersion();
          return store._epoch();
        },
        /** Ends a mutation (no-op for a token of a previous session). */
        _finish(token: number): void {
          if (token !== store._epoch()) {
            return;
          }
          inFlight--;
          store._bumpVersion();
          if (inFlight === 0 && refetchWanted) {
            refetchWanted = false;
            void lastFetch?.();
          }
        },
        _isCurrent: (token: number): boolean => token === store._epoch(),
      };
    }),
  );
}
