import type { MonitoringConfig } from '@shelfmark/contracts';
import type { ErrorReporter } from './error-reporter.type';

/**
 * Loads and starts the Sentry SDK for a configured DSN, resolving to its reporter.
 * `tunnel` is the same-origin URL the SDK posts its envelopes to.
 */
export type SentryLoader = (
  config: MonitoringConfig & { dsn: string },
  tunnel: string,
) => Promise<ErrorReporter>;
