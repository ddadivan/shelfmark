import { Service, inject } from '@angular/core';
import {
  MONITORING_CONFIG_ROUTE,
  MONITORING_TUNNEL_ROUTE,
  type MonitoringConfig,
} from '@shelfmark/contracts';
import { API_BASE_URL } from '../api/api-base-url';
import { MAX_PENDING_ERRORS } from './models/max-pending-errors.const';
import type { ErrorReporter } from './models/error-reporter.type';
import { SENTRY_LOADER } from './sentry-loader.token';

function isMonitoringConfig(value: unknown): value is MonitoringConfig {
  if (typeof value !== 'object' || value === null) return false;
  const dsn: unknown = Reflect.get(value, 'dsn');
  return (
    (dsn === null || typeof dsn === 'string') &&
    typeof Reflect.get(value, 'environment') === 'string'
  );
}

/**
 * Error monitoring for the browser. Nothing is loaded and nothing is sent unless the API reports
 * a DSN; failures here are swallowed, monitoring must never break the app.
 */
@Service()
export class MonitoringService {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly loadSentry = inject(SENTRY_LOADER);

  private reporter: ErrorReporter | undefined;
  private pending: unknown[] = [];
  private started = false;
  private disabled = false;

  /** Reads the config from the API and, when it has a DSN, loads the SDK. Idempotent. */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      // Plain `fetch` on purpose: this runs outside the app's HttpClient interceptors (a failure
      // here must not hit the error interceptor or the global error handler and loop back into
      // monitoring), and the request carries no credentials.
      const response = await fetch(`${this.apiBaseUrl}${MONITORING_CONFIG_ROUTE}`, {
        credentials: 'omit',
        headers: { accept: 'application/json' },
      });
      const config: unknown = response.ok ? await response.json() : undefined;
      if (!isMonitoringConfig(config) || config.dsn === null) {
        this.disable();
        return;
      }
      this.reporter = await this.loadSentry(
        { ...config, dsn: config.dsn },
        `${this.apiBaseUrl}${MONITORING_TUNNEL_ROUTE}`,
      );
      const queued = this.pending;
      this.pending = [];
      queued.forEach((error) => this.reporter?.(error));
    } catch {
      this.disable();
    }
  }

  /** Forwards an error; errors raised before the SDK is ready are kept (up to a small limit). */
  report(error: unknown): void {
    if (this.reporter) {
      this.reporter(error);
    } else if (!this.disabled && this.pending.length < MAX_PENDING_ERRORS) {
      this.pending.push(error);
    }
  }

  private disable(): void {
    this.disabled = true;
    this.pending = [];
  }
}
