import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import type { LinkPreviewResponse } from '@shelfmark/contracts';
import { catchError, defer, EMPTY, from, map, mergeMap, of, type Observable } from 'rxjs';
import type { PastePreviewResult } from './models/paste-preview-result.interface';
import { PASTE_LIMIT } from './models/paste-limits.const';

/**
 * Loads the previews of pasted links through the existing preview endpoint, at most
 * `concurrency` at a time, in paste order, and emits each answer as it arrives. A failed preview
 * is `null` (the row keeps its address). A 429 stops the queue: requests in flight finish, the
 * rest are not sent, so a long paste does not hammer the rate limit; those rows keep their address
 * and the image capture fills in the page title after saving.
 */
export function loadPreviews(
  urls: readonly string[],
  fetch: (url: string) => Observable<LinkPreviewResponse>,
  concurrency: number = PASTE_LIMIT.PreviewConcurrency,
): Observable<PastePreviewResult> {
  return defer(() => {
    let stopped = false;
    return from(urls).pipe(
      // `mergeMap` calls the project only when a slot is free, so `stopped` is read late enough.
      mergeMap(
        (url) =>
          stopped
            ? EMPTY
            : fetch(url).pipe(
                map((response): PastePreviewResult => ({ url, response, stopped: false })),
                catchError((error: unknown) => {
                  const limited =
                    error instanceof HttpErrorResponse &&
                    error.status === (HttpStatusCode.TooManyRequests as number);
                  stopped ||= limited;
                  return of<PastePreviewResult>({ url, response: null, stopped: limited });
                }),
              ),
        concurrency,
      ),
    );
  });
}
