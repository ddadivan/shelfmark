import type { ErrorEvent } from '@sentry/node';
import { scrubText } from './scrub-text';

/**
 * `beforeSend` for the API: keeps the error type, message and stack, drops everything that
 * could identify a person or a saved link (PROJECT.md 5.7, 5.8).
 *
 * Removed: request (cookies, headers, query string, body), user (email, IP), breadcrumbs,
 * extra data, server name. Free text loses URLs, emails and auth tokens.
 * The web app has the same rules in `apps/web/src/app/core/monitoring/scrub-event.ts`.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.server_name;

  if (event.message !== undefined) event.message = scrubText(event.message);
  if (event.transaction !== undefined) event.transaction = scrubText(event.transaction);
  if (event.logentry?.message !== undefined) {
    event.logentry = { message: scrubText(event.logentry.message) };
  }
  for (const exception of event.exception?.values ?? []) {
    if (exception.value !== undefined) exception.value = scrubText(exception.value);
    delete exception.mechanism?.data;
  }
  return event;
}
