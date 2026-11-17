import { InjectionToken } from '@angular/core';
import { EXTENSION_STORE_URL } from '../../models/extension-store-url.const';

/** The extension's store page (`EXTENSION_STORE_URL`); replaced in tests. Empty: nothing offered. */
export const EXTENSION_STORE_HREF = new InjectionToken<string>('EXTENSION_STORE_HREF', {
  providedIn: 'root',
  factory: () => EXTENSION_STORE_URL,
});
