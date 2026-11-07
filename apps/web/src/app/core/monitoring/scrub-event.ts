import type { ErrorEvent } from '@sentry/browser';
import { scrubText } from './scrub-text';

function withoutQueryAndHash(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

/**
 * `beforeSend` for the browser: keeps the error type, message and stack, drops everything that
 * could identify a person or a saved link (PROJECT.md 5.7, 5.8).
 *
 * Removed: cookies, headers, request body, user (email, IP), breadcrumbs, extra data. The page URL
 * keeps only its path (no query string, no fragment). Free text loses URLs, emails and auth tokens.
 * The API has the same rules in `apps/api/src/monitoring/scrub-event.ts`.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;

  if (event.request?.url !== undefined) {
    event.request = { url: withoutQueryAndHash(event.request.url) };
  } else {
    delete event.request;
  }

  if (event.message !== undefined) event.message = scrubText(event.message);
  if (event.transaction !== undefined) event.transaction = scrubText(event.transaction);
  if (event.logentry?.message !== undefined) {
    event.logentry = { message: scrubText(event.logentry.message) };
  }
  for (const exception of event.exception?.values ?? []) {
    if (exception.value !== undefined) exception.value = scrubText(exception.value);
    delete exception.mechanism?.data;
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.filename !== undefined) frame.filename = withoutQueryAndHash(frame.filename);
    }
  }
  return event;
}
