import { InjectionToken } from '@angular/core';

/**
 * CSS selector of regions that never start a ripple, provided by a component that uses
 * `RippleDirective` as a host directive (where the `uiRippleIgnore` input cannot be bound).
 */
export const UI_RIPPLE_IGNORE = new InjectionToken<string>('UI_RIPPLE_IGNORE');
