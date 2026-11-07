import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { AUTH_ROUTE } from './models/auth-routes.const';
import { SIGN_IN_QUERY } from './models/sign-in-query.const';

/** Matches only for guests (landing, sign-in). Waits for the one session request. */
export const guestOnly: CanMatchFn = async () => {
  const auth = inject(AuthStore);
  await auth.ensureLoaded();
  return !auth.isSignedIn();
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
