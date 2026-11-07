import type { ErrorEvent } from '@sentry/node';
import { scrubText } from './scrub-text';

/** Context keys that carry only runtime facts, never user data. */
const ALLOWED_CONTEXTS = ['runtime', 'os', 'browser'];
const WITHHELD_MESSAGE = 'Server error (message withheld)';

/**
 * `beforeSend` for the API: keeps the error type and the stack (file, function, line), drops
 * everything that could identify a person or a saved link (PROJECT.md 5.7, 5.8).
 *
 * Removed: request (cookies, headers, query string, body), user (email, IP), breadcrumbs,
 * extra data, server name, source lines and local variables of stack frames, absolute paths,
 * every context except runtime/os/browser. Exception messages are replaced by a generic text
 * (they can embed saved link URLs or Prisma query text); the exception type stays.
 * Tag values and other free text lose URLs, hosts, emails and auth tokens; the `requestId` tag
 * is kept as is.
 * The web app has the same rules in `apps/web/src/app/core/monitoring/scrub-event.ts`.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.server_name;

  if (event.contexts) {
    event.contexts = Object.fromEntries(
      Object.entries(event.contexts).filter(([key]) => ALLOWED_CONTEXTS.includes(key)),
    );
  }
  if (event.tags) {
    event.tags = Object.fromEntries(
      Object.entries(event.tags).map(([key, value]) => [
        key,
        key === 'requestId' || typeof value !== 'string' ? value : scrubText(value),
      ]),
    );
  }

  if (event.message !== undefined) event.message = scrubText(event.message);
  if (event.transaction !== undefined) event.transaction = scrubText(event.transaction);
  if (event.logentry?.message !== undefined) {
    event.logentry = { message: scrubText(event.logentry.message) };
  }
  for (const exception of event.exception?.values ?? []) {
    if (exception.value !== undefined) exception.value = WITHHELD_MESSAGE;
    delete exception.mechanism?.data;
    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.abs_path;
      delete frame.context_line;
      delete frame.pre_context;
      delete frame.post_context;
      delete frame.vars;
    }
  }
  return event;
}
