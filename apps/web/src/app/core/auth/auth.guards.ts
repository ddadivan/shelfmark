import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { APP_PATH } from '../../models/app-path.const';
import { AuthStore } from './auth.store';
import { AUTH_ROUTE } from './models/auth-routes.const';
import { SIGN_IN_QUERY } from './models/sign-in-query.const';
import { hasSessionHint } from './session-hint';

/** Matches only for guests (sign-in). Waits for the one session request. */
export const guestOnly: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  await auth.ensureLoaded();
  return !auth.isSignedIn();
};

/**
 * The landing at `/`. With a session hint it waits like `guestOnly`, so a signed-in user goes
 * straight to the app shell. Without one the visitor is almost surely a guest on a first visit:
 * the landing matches at once and the session is asked in the background, so a cold API never
 * holds the first paint. If a session turns up after all, the app replaces the landing.
 */
export const landingGuestOnly: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  if (auth.loaded() || hasSessionHint()) {
    await auth.ensureLoaded();
    return !auth.isSignedIn();
  }
  const router = inject(Router);
  void auth.ensureLoaded().then(() => {
    if (auth.isSignedIn() && router.parseUrl(router.url).root.children['primary'] === undefined) {
      void router.navigateByUrl(`/${APP_PATH.Links}`, { replaceUrl: true });
    }
  });
  return true;
};

/** Matches only for signed-in users (the app shell and its pages). */
export const authOnly: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  await auth.ensureLoaded();
  return auth.isSignedIn();
};

/** For a guest on a protected URL: to sign-in, remembering where to come back to. */
export const redirectToSignIn: CanActivateFn = (_route, state) =>
  inject(Router).createUrlTree([AUTH_ROUTE.SignIn], {
    queryParams: { [SIGN_IN_QUERY.ReturnUrl]: state.url },
  });
