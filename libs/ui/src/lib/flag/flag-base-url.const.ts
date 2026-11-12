import { InjectionToken } from '@angular/core';

/**
 * Folder of the flag files, with a trailing slash. External SVG files (not inlined) keep the
 * strict CSP as it is (`img-src 'self'`); apps/web and Storybook both serve `libs/ui/src/assets`
 * at `assets/ui`. Relative, so it relies on `<base href="/">` in the host page.
 */
export const FLAG_BASE_URL = new InjectionToken<string>('FLAG_BASE_URL', {
  providedIn: 'root',
  factory: () => 'assets/ui/flags/',
});
