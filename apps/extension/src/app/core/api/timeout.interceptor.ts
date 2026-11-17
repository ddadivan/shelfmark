import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { throwError, timeout } from 'rxjs';
import { inject } from '@angular/core';
import { REQUEST_TIMEOUT } from './request-timeout.token';

/**
 * Gives up on a request that has not answered in `REQUEST_TIMEOUT` (15 s) (#467). Unsubscribing aborts
 * the fetch; the error is a status 0 `HttpErrorResponse`, the same as no connection, so the popup
 * shows its offline screen with Try again. A save that did reach the server is caught by the
 * duplicate check on the retry.
 */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    timeout({
      // `each`, not `first`: HttpClient emits `Sent` at once, so `first` would never fire; the next
      // event is the response.
      each: inject(REQUEST_TIMEOUT),
      with: () =>
        throwError(
          () => new HttpErrorResponse({ status: 0, statusText: 'Timeout', url: req.urlWithParams }),
        ),
    }),
  );
