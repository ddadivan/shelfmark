import { InjectionToken } from '@angular/core';

/** Leaves the app with a full-page navigation (`location.assign`); replaced in tests. */
export const NAVIGATE = new InjectionToken<(url: string) => void>('NAVIGATE', {
  providedIn: 'root',
  factory: () => (url: string) => globalThis.location.assign(url),
});
