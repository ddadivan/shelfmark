import { InjectionToken } from '@angular/core';

/**
 * True when the Reader articles are canned samples (the mock API of `npm start`): the Reader then
 * says so in a note. False by default; `provideLinksApi()` sets it with the mock API.
 */
export const READER_SAMPLE = new InjectionToken<boolean>('READER_SAMPLE', {
  providedIn: 'root',
  factory: () => false,
});
