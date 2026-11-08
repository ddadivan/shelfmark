import { InjectionToken } from '@angular/core';
import { loadSentry } from './load-sentry';
import type { SentryLoader } from './models/sentry-loader.type';

/** Seam for tests; the default loader imports the SDK lazily. */
export const SENTRY_LOADER = new InjectionToken<SentryLoader>('SENTRY_LOADER', {
  providedIn: 'root',
  factory: () => loadSentry,
});
