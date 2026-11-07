import type { MonitoringConfig } from '@shelfmark/contracts';
import type { ErrorReporter } from './error-reporter.type';

/** Loads and starts the Sentry SDK for a configured DSN, resolving to its reporter. */
export type SentryLoader = (config: MonitoringConfig & { dsn: string }) => Promise<ErrorReporter>;
