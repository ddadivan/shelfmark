import { parseDsn } from './parse-dsn';
import type { MonitoringSettings } from './models/monitoring-settings.interface';

/**
 * Reads `SENTRY_DSN`, `SENTRY_WEB_DSN`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` and `NODE_ENV`.
 * A malformed DSN counts as "not configured": monitoring must never stop the app from booting.
 */
export function readMonitoringSettings(env: NodeJS.ProcessEnv = process.env): MonitoringSettings {
  const release = env['VERCEL_GIT_COMMIT_SHA'];
  return {
    apiDsn: parseDsn(env['SENTRY_DSN']),
    webDsn: parseDsn(env['SENTRY_WEB_DSN']),
    environment: env['VERCEL_ENV'] || env['NODE_ENV'] || 'production',
    release: release ? release : null,
  };
}
