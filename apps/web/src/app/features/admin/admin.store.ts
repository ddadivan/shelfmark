import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { SessionScope } from '../../core/auth/session-scope.service';
import { ADMIN_API } from './models/admin-api.const';
import type { AdminState } from './models/admin-state.interface';

const initialState: AdminState = { admin: null };

/**
 * Whether the signed-in user is the author. `check()` asks `/api/admin/status` once per session
 * (a 404 and any failure both mean "no"); the account menu and the You list show the "Feedback
 * inbox" entry only while `isAdmin()` is true, and `adminOnly` waits for `check()`. The answer is
 * dropped when the session ends. The server decides on every admin request anyway; this only
 * hides what a regular user could not use.
 */
export const AdminStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ admin }) => ({
    isAdmin: computed(() => admin() === true),
  })),
  withMethods((store, api = inject(ADMIN_API), scope = inject(SessionScope)) => {
    let checking: Promise<boolean> | null = null;
    /** Bumped by `clear()`: an answer for an earlier session is dropped. */
    let epoch = 0;

    function clear(): void {
      epoch += 1;
      checking = null;
      patchState(store, initialState);
    }
    scope.onEnd(clear);

    return {
      /** Resolves with whether the user is the author; asks the API only the first time. */
      check(): Promise<boolean> {
        if (store.admin() !== null) {
          return Promise.resolve(store.admin() === true);
        }
        if (checking !== null) {
          return checking;
        }
        const startedIn = epoch;
        const run = api
          .isAdmin()
          .catch(() => false)
          .then((admin) => {
            if (startedIn === epoch) {
              patchState(store, { admin });
              checking = null;
            }
            return admin;
          });
        checking = run;
        return run;
      },
      clear,
    };
  }),
);
