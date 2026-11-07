import { MONITORING_TUNNEL_PATH } from '@shelfmark/contracts';
import { scrubEvent } from './scrub-event';
import type { SentryLoader } from './models/sentry-loader.type';

/**
 * Loads `@sentry/browser` on demand (its own lazy chunk, never part of the initial bundle) and
 * starts it. Only called when the API reports a DSN.
 *
 * Deliberately minimal: no session replay, no tracing, no breadcrumbs, no sessions, and no global
 * handlers (Angular's `ErrorHandler` already receives window errors and unhandled rejections
 * through `provideBrowserGlobalErrorListeners`, so the SDK's own would report each error twice).
 * Events go through the same-origin tunnel, so the CSP stays `connect-src 'self'` (ADR 0032).
 */
export const loadSentry: SentryLoader = async (config) => {
  const sentry = await import('@sentry/browser');
  sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    ...(config.release === null ? {} : { release: config.release }),
    tunnel: MONITORING_TUNNEL_PATH,
    sendClientReports: false,
    maxBreadcrumbs: 0,
    defaultIntegrations: [
      sentry.eventFiltersIntegration(),
      sentry.functionToStringIntegration(),
      sentry.linkedErrorsIntegration(),
      sentry.dedupeIntegration(),
    ],
    beforeSend: scrubEvent,
    beforeBreadcrumb: () => null,
  });
  return (error) => {
    sentry.captureException(error);
  };
};
