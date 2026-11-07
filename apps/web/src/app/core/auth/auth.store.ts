import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { AUTH_API } from './auth-api.token';
import { AUTH_DEMO } from './models/auth-pending.const';
import { AuthProvider } from './models/auth-provider.type';
import { AuthState } from './models/auth-state.interface';
import { AuthUser } from './models/auth-user.interface';

const initialState: AuthState = { user: null, loaded: false, pending: null, failed: false };

/**
 * The current user, cached for the whole app. `ensureLoaded()` asks the API once (guards await
 * it, so there is one session request at startup); sign-in and sign-out update the same state.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user }) => ({
    isSignedIn: computed(() => user() !== null),
  })),
  withMethods((store, api = inject(AUTH_API)) => {
    let loading: Promise<void> | null = null;

    async function run(
      pending: AuthState['pending'],
      action: () => Promise<AuthUser>,
    ): Promise<void> {
      if (store.pending() !== null) {
        return;
      }
      patchState(store, { pending, failed: false });
      try {
        patchState(store, { user: await action(), loaded: true, pending: null });
      } catch {
        patchState(store, { pending: null, failed: true });
      }
    }

    return {
      /** Resolves when the session is known; later calls reuse the first request. */
      ensureLoaded(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        loading ??= api
          .getSession()
          .catch(() => null)
          .then((user) => patchState(store, { user, loaded: true }));
        return loading;
      },
      signIn: (provider: AuthProvider) => run(provider, () => api.signIn(provider)),
      signInDemo: () => run(AUTH_DEMO, () => api.signInDemo()),
      /** Clears the session; a failing API still ends the local session. */
      async signOut(): Promise<void> {
        try {
          await api.signOut();
        } catch {
          // The local session ends either way; the server session expires on its own.
        }
        patchState(store, { user: null, loaded: true, failed: false });
      },
    };
  }),
);
