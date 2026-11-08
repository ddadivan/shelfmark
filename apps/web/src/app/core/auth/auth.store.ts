import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { TagsStore } from '../../stores/tags.store';
import { AUTH_API } from './auth-api.token';
import { SIGN_OUT_FLUSH_TIMEOUT_MS } from './models/sign-out-flush-timeout.const';
import { AUTH_ROUTE } from './models/auth-routes.const';
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
  withMethods(
    (
      store,
      api = inject(AUTH_API),
      router = inject(Router),
      links = inject(LinksStore),
      folders = inject(FoldersStore),
      tags = inject(TagsStore),
    ) => {
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

      async function flushWithin(ms: number): Promise<void> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, ms);
        });
        try {
          await Promise.race([Promise.all([links.flushPending(), tags.flushPending()]), timeout]);
        } catch {
          // A failed flush restores the links in the store; sign-out goes on.
        } finally {
          clearTimeout(timer);
        }
      }

      /**
       * Clears the session; the mock cannot fail, and a failing API still ends the local session.
       * #64: clear local state only after the server confirms, and surface failures.
       */
      async function signOut(): Promise<void> {
        try {
          // Before the session ends, so deletes still waiting for their Undo window can be sent;
          // never longer than the timeout, and a failure must not keep the user signed in.
          await flushWithin(SIGN_OUT_FLUSH_TIMEOUT_MS);
          await api.signOut();
        } catch {
          // The local session ends either way; the server session expires on its own.
        } finally {
          links.reset();
          folders.reset();
          tags.reset();
          patchState(store, { user: null, loaded: true, failed: false });
        }
      }

      return {
        /** Resolves when the session is known; later calls reuse the first request. */
        ensureLoaded(): Promise<void> {
          if (store.loaded()) {
            return Promise.resolve();
          }
          // A failed request leaves `loaded` false and clears `loading`, so the next guard call
          // retries; the current navigation is treated as a guest (fail-closed).
          loading ??= api
            .getSession()
            .then(
              (user) => patchState(store, { user, loaded: true }),
              () => undefined,
            )
            .finally(() => (loading = null));
          return loading;
        },
        signIn: (provider: AuthProvider) => run(provider, () => api.signIn(provider)),
        signInDemo: () => run(AUTH_DEMO, () => api.signInDemo()),
        signOut,
        /** Sets the onboarding flag of the signed-in user; no-op for a guest. */
        setOnboardingCompletedAt(onboardingCompletedAt: string | null): void {
          const user = store.user();
          if (user) {
            patchState(store, { user: { ...user, onboardingCompletedAt } });
          }
        },
        /** Signs out, then goes to the sign-in screen. */
        async signOutAndLeave(): Promise<void> {
          await signOut();
          await router.navigateByUrl(AUTH_ROUTE.SignIn);
        },
      };
    },
  ),
);
