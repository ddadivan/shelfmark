import {
  dedupeIntegration,
  eventFiltersIntegration,
  functionToStringIntegration,
  init,
  linkedErrorsIntegration,
  onUnhandledRejectionIntegration,
} from '@sentry/node';
import type { MonitoringSettings } from './models/monitoring-settings.interface';
import { scrubEvent } from './scrub-event';

/**
 * Starts the Sentry Node SDK when `SENTRY_DSN` is set. Returns `false` and does nothing otherwise.
 *
 * Deliberately minimal: no tracing, no profiling, no breadcrumbs, no request instrumentation
 * (no http, fetch, console or express hooks), so only explicit exceptions and unhandled
 * rejections are captured and nothing patches Node internals.
 */
export function initMonitoring(settings: MonitoringSettings): boolean {
  if (!settings.apiDsn) return false;
  init({
    dsn: settings.apiDsn.dsn,
    environment: settings.environment,
    ...(settings.release === null ? {} : { release: settings.release }),
    sendClientReports: false,
    maxBreadcrumbs: 0,
    enableRuntimeChannelInjection: false,
    defaultIntegrations: [
      eventFiltersIntegration(),
      functionToStringIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
      onUnhandledRejectionIntegration(),
    ],
    beforeSend: scrubEvent,
    beforeBreadcrumb: () => null,
  });
  return true;
}
