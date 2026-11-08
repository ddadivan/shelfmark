import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AUTH_ROUTE } from '../auth/models/auth-routes.const';
import { SIGN_IN_QUERY } from '../auth/models/sign-in-query.const';
import { SIGN_IN_REASON } from '../auth/models/sign-in-reason.const';
import { safeReturnUrl } from '../auth/safe-return-url';
import { API_BASE_URL } from './api-base-url';
import { ApiErrorToastService } from './api-error-toast.service';
import { SKIP_ERROR_TOAST } from './models/skip-error-toast.const';

const AUTH_SEGMENT = 'auth';

/** True for a same-origin request to `/api/**` that is not part of `/api/auth/**`. */
function isGuardedApiRequest(url: string, base: string): boolean {
  const { origin } = globalThis.location;
  let target: URL;
  try {
    target = new URL(url, origin);
  } catch {
    return false;
  }
  const authBase = `${base}/${AUTH_SEGMENT}`;
  const isUnder = (path: string, prefix: string): boolean =>
    path === prefix || path.startsWith(`${prefix}/`);
  return (
    target.origin === origin &&
    target.pathname.startsWith(`${base}/`) &&
    !isUnder(target.pathname, authBase)
  );
}

/**
 * Global error handling (PROJECT.md 5.1), after the base interceptor. A 401 from `/api/**`
 * (not `/api/auth/**`) means the session is gone: the user is cleared and sent to the sign-in
 * screen with the page they were on as `returnUrl`. Nothing happens when the user is already gone
 * (a parallel 401, or signed out). A 429 or 5xx from the same requests shows one error toast
 * unless the caller opted out with `SKIP_ERROR_TOAST` (it shows its own message). Every error is
 * rethrown, so callers still see it.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const base = inject(API_BASE_URL);
  const guarded = isGuardedApiRequest(req.url, base);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (guarded && error instanceof HttpErrorResponse && !req.context.get(SKIP_ERROR_TOAST)) {
        if (error.status === HttpStatusCode.TooManyRequests) {
          injector.get(ApiErrorToastService).show('errors.rateLimited');
        } else if (error.status >= HttpStatusCode.InternalServerError && error.status < 600) {
          injector.get(ApiErrorToastService).show('errors.server');
        }
      }
      if (
        guarded &&
        error instanceof HttpErrorResponse &&
        error.status === HttpStatusCode.Unauthorized
      ) {
        const auth = injector.get(AuthStore);
        if (auth.user() === null) {
          return throwError(() => error);
        }
        const router = injector.get(Router);
        auth.expireSession();
        const onSignIn = router.url.split(/[?#]/)[0] === AUTH_ROUTE.SignIn;
        if (!onSignIn) {
          void router.navigate([AUTH_ROUTE.SignIn], {
            queryParams: {
              [SIGN_IN_QUERY.Reason]: SIGN_IN_REASON.SessionExpired,
              [SIGN_IN_QUERY.ReturnUrl]: safeReturnUrl(router.url) ?? undefined,
            },
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
