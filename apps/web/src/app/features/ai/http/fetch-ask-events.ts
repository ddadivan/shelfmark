import { HttpErrorResponse } from '@angular/common/http';
import type { AskEvent, AskRequest } from '@shelfmark/contracts';
import { Observable } from 'rxjs';
import { createAskSseParser } from '../utils/parse-sse';

/**
 * `POST` an Ask question and read the `text/event-stream` answer with `fetch` and a stream reader
 * (ADR 0052): no `EventSource`, so the question stays out of the URL and a reconnect never asks
 * twice. Same-origin credentials, like the API base interceptor. A non-2xx answer (400, 401, 403,
 * 429) errors with an `HttpErrorResponse` (`fetch` bypasses the interceptors, so `AskStore` maps a
 * 429 to the rate-limit line and a 401 to the session end); unsubscribing aborts the request, which
 * stops the model.
 */
export function fetchAskEvents(
  url: string,
  request: AskRequest,
  fetchFn: typeof fetch = (input, init) => globalThis.fetch(input, init),
): Observable<AskEvent> {
  return new Observable<AskEvent>((subscriber) => {
    const controller = new AbortController();
    const run = async (): Promise<void> => {
      const response = await fetchFn(url, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok || response.body === null) {
        subscriber.error(new HttpErrorResponse({ status: response.status, url }));
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createAskSseParser();
      for (;;) {
        const { done, value } = await reader.read();
        const events = done
          ? [...parser.push(decoder.decode()), ...parser.end()]
          : parser.push(decoder.decode(value, { stream: true }));
        for (const event of events) {
          subscriber.next(event);
        }
        if (done) {
          break;
        }
      }
      subscriber.complete();
    };
    run().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        subscriber.error(error);
      }
    });
    return () => controller.abort();
  });
}
