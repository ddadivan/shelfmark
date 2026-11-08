import type { ParsedDsn } from './parsed-dsn.interface';

/** Monitoring settings read from the platform environment. Without a DSN everything is a no-op. */
export interface MonitoringSettings {
  /** DSN of the API project (`SENTRY_DSN`). */
  apiDsn: ParsedDsn | undefined;
  /** DSN of the web project (`SENTRY_WEB_DSN`), handed to the browser and accepted by the tunnel. */
  webDsn: ParsedDsn | undefined;
  environment: string;
  release: string | null;
}
