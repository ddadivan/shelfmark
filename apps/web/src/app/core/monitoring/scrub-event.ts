import type { ErrorEvent } from '@sentry/browser';
import { scrubText } from './scrub-text';

/** Context keys that carry only runtime facts, never user data. */
const ALLOWED_CONTEXTS = ['runtime', 'os', 'browser'];

function withoutQueryAndHash(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

/**
 * `beforeSend` for the browser: keeps the error type, message and stack (file, function, line),
 * drops everything that could identify a person or a saved link (PROJECT.md 5.7, 5.8).
 *
 * Removed: cookies, headers, request body, user (email, IP), breadcrumbs, extra data, source
 * lines and local variables of stack frames, every context except runtime/os/browser. The page
 * URL and stack frame paths keep no query string and no fragment. Free text and tag values lose
 * URLs, hosts, emails and auth tokens; the `requestId` tag is kept as is.
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
    if (exception.value !== undefined) exception.value = scrubText(exception.value);
    delete exception.mechanism?.data;
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.filename !== undefined) frame.filename = withoutQueryAndHash(frame.filename);
      if (frame.abs_path !== undefined) frame.abs_path = withoutQueryAndHash(frame.abs_path);
      delete frame.context_line;
      delete frame.pre_context;
      delete frame.post_context;
      delete frame.vars;
    }
  }
  return event;
}
