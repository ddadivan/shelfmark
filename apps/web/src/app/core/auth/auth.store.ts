import { computed, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { AuthProvider, AuthUser } from '@shelfmark/contracts';
import { AUTH_API } from './auth-api.token';
import { SessionScope } from './session-scope.service';
import { DemoSignInError } from './demo-sign-in-error';
import { SIGN_OUT_FLUSH_TIMEOUT_MS } from './models/sign-out-flush-timeout.const';
import { AUTH_ROUTE } from './models/auth-routes.const';
import { SIGN_IN_QUERY } from './models/sign-in-query.const';
import { SIGN_IN_REASON } from './models/sign-in-reason.const';
import type { SignInReason } from './models/sign-in-reason.type';
import { AUTH_DEMO } from './models/auth-pending.const';
import { AuthState } from './models/auth-state.interface';
import { TAB_SYNC_KIND } from '../sync/models/tab-sync-kind.const';
import { TabSyncService } from '../sync/tab-sync.service';

const initialState: AuthState = {
  user: null,
  loaded: false,
  pending: null,
  failed: false,
  demoError: null,
};

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
    (store, router = inject(Router), injector = inject(Injector), scope = inject(SessionScope)) => {
      // Resolved on use: pages that only read `user` (landing, library) need no auth API in specs.
      const api = () => injector.get(AUTH_API);
      let loading: Promise<void> | null = null;

      /**
       * Forgets everything cached for the user: whatever registered with `SessionScope` (the
       * library stores, onboarding and rating).
       */
      /** Tells the other tabs a user is signed in here (they reload when locked or signed out). */
      function announceSignedIn(user: AuthUser | null): void {
        if (user) {
          injector.get(TabSyncService).post({ kind: TAB_SYNC_KIND.SignedIn }, user.id);
        }
      }

      function clearUserState(): void {
        scope.end();
      }

      async function run(
        pending: AuthState['pending'],
        action: () => Promise<AuthUser | null>,
      ): Promise<void> {
        if (store.pending() !== null) {
          return;
        }
        patchState(store, { pending, failed: false, demoError: null });
        try {
          const user = await action();
          if (user === null) {
            // The browser is on its way to the provider: keep `pending` (spinner, locked
            // buttons) until the page unloads. `pageshow` resets it if the page is restored.
            return;
          }
          patchState(store, { user, loaded: true, pending: null });
          announceSignedIn(user);
        } catch (error) {
          patchState(store, {
            pending: null,
            failed: true,
            demoError: error instanceof DemoSignInError ? error.kind : null,
          });
        }
      }

      async function flushWithin(ms: number): Promise<void> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<void>((resolve) => {
          timer = setTimeout(resolve, ms);
        });
        try {
          await Promise.race([scope.flush(), timeout]);
        } catch {
          // A failed flush restores the links in the store; sign-out goes on.
        } finally {
          clearTimeout(timer);
        }
      }

      /**
       * Ends the session. Local state is cleared only after the server confirmed; on failure the
       * user stays signed in and sees an error. Resolves with whether the user signed out.
       */
      async function signOut(): Promise<boolean> {
        // Before the session ends, so deletes still waiting for their Undo window can be sent;
        // never longer than the timeout.
        await flushWithin(SIGN_OUT_FLUSH_TIMEOUT_MS);
        try {
          await api().signOut();
        } catch {
          injector.get(ToastService).show({
            kind: TOAST_KIND.Danger,
            title: injector.get(TranslocoService).translate('auth.signOutFailed'),
            detail: injector.get(TranslocoService).translate('auth.signOutFailedDetail'),
          });
          return false;
        }
        const userId = store.user()?.id;
        clearUserState();
        patchState(store, { user: null, loaded: true, failed: false });
        // The other tabs lock too (tab sync, #268).
        if (userId) {
          injector.get(TabSyncService).post({ kind: TAB_SYNC_KIND.SignedOut }, userId);
        }
        return true;
      }

      return {
        /** Resolves when the session is known; later calls reuse the first request. */
        ensureLoaded(): Promise<void> {
          if (store.loaded()) {
            return Promise.resolve();
          }
          // A failed request leaves `loaded` false and clears `loading`, so the next guard call
          // retries; the current navigation is treated as a guest (fail-closed).
          loading ??= api()
            .getSession()
            .then(
              (user) => {
                patchState(store, { user, loaded: true });
                announceSignedIn(user);
              },
              () => undefined,
            )
            .finally(() => (loading = null));
          return loading;
        },
        signIn: (provider: AuthProvider, returnUrl: string | null = null) =>
          run(provider, () => api().signIn(provider, returnUrl)),
        signInDemo: () => run(AUTH_DEMO, () => api().signInDemo()),
        signOut,
        /**
         * The demo ran out: the server session is probably gone already, so a failing sign-out
         * call is ignored. Local state is cleared and the sign-in screen shows the reason.
         */
        async expireDemo(): Promise<void> {
          try {
            await api().signOut();
          } catch {
            // Expected when the session expired on the server; nothing to tell the user.
          }
          clearUserState();
          patchState(store, { user: null, loaded: true, pending: null, failed: false });
          await router.navigate([AUTH_ROUTE.SignIn], {
            queryParams: { [SIGN_IN_QUERY.Reason]: SIGN_IN_REASON.DemoExpired },
          });
        },
        /**
         * The server no longer knows this session (401): forget the user and the cached library
         * without calling the API. Navigation is the caller's job.
         */
        expireSession(): void {
          clearUserState();
          patchState(store, { user: null, loaded: true, pending: null, failed: false });
        },
        /** Sets the onboarding flag of the signed-in user; no-op for a guest. */
        setOnboardingCompletedAt(onboardingCompletedAt: string | null): void {
          const user = store.user();
          if (user) {
            patchState(store, { user: { ...user, onboardingCompletedAt } });
          }
        },
        /**
         * Signs out, then goes to the sign-in screen, with `?reason=` when given (not when
         * sign-out failed).
         */
        async signOutAndLeave(reason?: SignInReason): Promise<void> {
          if (await signOut()) {
            await router.navigate([AUTH_ROUTE.SignIn], {
              queryParams: reason ? { [SIGN_IN_QUERY.Reason]: reason } : {},
            });
          }
        },
      };
    },
  ),
  withHooks((store) => ({
    onInit(): void {
      // Back from the provider through the back/forward cache: the page is restored as it was
      // left, so a sign-in that was only starting must not stay pending.
      globalThis.addEventListener?.('pageshow', (event: PageTransitionEvent) => {
        if (event.persisted && store.pending() !== null) {
          patchState(store, { pending: null });
        }
      });
    },
  })),
);
