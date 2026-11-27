import type { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { AUTH_ROUTE } from './models/auth-routes.const';
import { SIGN_IN_QUERY } from './models/sign-in-query.const';
import { SIGN_IN_REASON } from './models/sign-in-reason.const';
import { safeReturnUrl } from './safe-return-url';
import { urlPath } from '../routing/url-path';

/**
 * A 401 from `/api/**`: the session is gone. Clears the user and goes to the sign-in screen with the
 * page they were on as `returnUrl`. Nothing happens when the user is already gone (a parallel 401,
 * or signed out). Shared by the error interceptor and requests that bypass `HttpClient` (Ask).
 */
export function expireSession(injector: Injector): void {
  const auth = injector.get(AuthStore);
  if (auth.user() === null) {
    return;
  }
  const router = injector.get(Router);
  auth.expireSession();
  const onSignIn = urlPath(router.url) === AUTH_ROUTE.SignIn;
  if (!onSignIn) {
    void router.navigate([AUTH_ROUTE.SignIn], {
      queryParams: {
        [SIGN_IN_QUERY.Reason]: SIGN_IN_REASON.SessionExpired,
        [SIGN_IN_QUERY.ReturnUrl]: safeReturnUrl(router.url) ?? undefined,
      },
    });
  }
}
