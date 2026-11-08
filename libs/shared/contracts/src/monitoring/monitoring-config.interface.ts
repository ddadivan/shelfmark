/**
 * Public monitoring settings for the web app, served by `GET /api/monitoring/config`.
 * `dsn` is `null` when error reporting is not configured: the web app then never loads the SDK.
 * A Sentry DSN is a public client key by design; it only allows sending events.
 */
export interface MonitoringConfig {
  dsn: string | null;
  environment: string;
  release: string | null;
}
