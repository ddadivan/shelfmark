import { InjectionToken } from '@angular/core';
import { REQUEST_TIMEOUT_MS } from './models/request-timeout-ms.const';

/** How long a request may take (`REQUEST_TIMEOUT_MS`); a spec sets a few milliseconds. */
export const REQUEST_TIMEOUT = new InjectionToken<number>('REQUEST_TIMEOUT', {
  providedIn: 'root',
  factory: () => REQUEST_TIMEOUT_MS,
});
