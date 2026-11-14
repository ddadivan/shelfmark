import { InjectionToken } from '@angular/core';

/**
 * The accessible name of the toast's close button, resolved when a toast shows (so a language
 * change applies). The app provides its translation; the default is English.
 */
export const TOAST_DISMISS_LABEL = new InjectionToken<() => string>('TOAST_DISMISS_LABEL', {
  providedIn: 'root',
  factory: () => () => 'Dismiss',
});
