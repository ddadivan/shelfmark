import { inject } from '@angular/core';
import { patchState, signalStoreFeature, type, withHooks, withMethods } from '@ngrx/signals';
import type { SessionLoadOptions } from './models/session-load-options.interface';
import { SessionScope } from '../../core/auth/session-scope.service';

/**
 * The per-user load bookkeeping every library store needs: an `epoch` that the session end bumps
 * (a response that started before it belongs to the previous user and must be dropped), a `version`
 * for "did anything change while this request ran", a request sequence for "only the newest list
 * may write", the de-duplicated first load, and the reset to `initialState` when the session ends
 * (registered with `SessionScope` by the feature itself).
 *
 * A store that exposes `reset()` itself (callers and specs go through it) sets `manualEnd` and
 * registers its own `SessionScope.onEnd` that calls `reset()`, which calls `_endSession()`.
 *
 * Everything is a private (`_`) member: the public API of the store using it does not change.
 * `withRemoteLoad` builds the full stale-response guard on top; stores whose guard is their own
 * (they compare versions by value, or race several kinds of request) use this directly.
 */
export function withSessionLoad<State extends object>(
  initialState: State,
  options: SessionLoadOptions = {},
) {
  return signalStoreFeature(
    { state: type<State>() },
    withMethods((store) => {
      let epoch = 0;
      let version = 0;
      let seq = 0;
      let firstLoad: Promise<void> | null = null;
      const endHandlers = new Set<() => void>();

      return {
        /** Bumped only by the session end. Take it before a request, compare after. */
        _epoch: (): number => epoch,
        /** Changes whenever the caller says state was written (`_bumpVersion`). */
        _version: (): number => version,
        _bumpVersion: (): number => ++version,
        /** Starts a list request: only the newest one (`_isNewest`) may write its answer. */
        _nextSeq: (): number => ++seq,
        _isNewest: (mine: number): boolean => mine === seq,
        /** Shares one running first load between callers; a failure or finish allows the next. */
        _dedupe(fetch: () => Promise<void>): Promise<void> {
          if (firstLoad === null) {
            const request: Promise<void> = fetch().finally(() => {
              // The session end may have started a newer load meanwhile: clear only our own.
              if (firstLoad === request) {
                firstLoad = null;
              }
            });
            firstLoad = request;
          }
          return firstLoad;
        },
        /** Lets the next `_dedupe` start a new request (the query it was loading changed). */
        _clearFirstLoad(): void {
          firstLoad = null;
        },
        /** Extra clearing at the session end (maps, entities), run before the state is reset. */
        _onSessionEnd(handler: () => void): void {
          endHandlers.add(handler);
        },
        /** Forgets this user: drops requests in flight and resets the state. */
        _endSession(): void {
          epoch++;
          seq++;
          version++;
          firstLoad = null;
          for (const handler of endHandlers) {
            handler();
          }
          patchState(store, initialState);
        },
      };
    }),
    withHooks({
      onInit(store) {
        if (options.manualEnd !== true) {
          inject(SessionScope).onEnd(() => store._endSession());
        }
      },
    }),
  );
}
