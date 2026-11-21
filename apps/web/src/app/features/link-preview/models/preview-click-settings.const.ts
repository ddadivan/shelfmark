import { InjectionToken } from '@angular/core';

/**
 * Whether the click settings of the link preview apply (#555): Settings › Library › Clicking a
 * link, Sites that open in a new tab, and "Always open <domain> in a new tab" in the blocked
 * state. Off for now: a plain click on a card or row always opens the preview (⌘ / Ctrl-click
 * opens the link), and those controls are hidden. The code stays so they can come back.
 */
export const PREVIEW_CLICK_SETTINGS = new InjectionToken<boolean>('PREVIEW_CLICK_SETTINGS', {
  factory: () => false,
});
