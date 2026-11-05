import { InjectionToken } from '@angular/core';

/**
 * URL of the icon sprite. The sprite is an external file (not inlined) so the strict CSP
 * needs no `unsafe-inline`; apps/web and Storybook both serve it at this path.
 * The default is relative, so it relies on `<base href="/">` in the host page.
 */
export const ICON_SPRITE_URL = new InjectionToken<string>('ICON_SPRITE_URL', {
  providedIn: 'root',
  factory: () => 'assets/ui/icons/sprite.svg',
});
