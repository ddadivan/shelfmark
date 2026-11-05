import { InjectionToken } from '@angular/core';
import type { UiFocusTarget } from './ui-focus-target.interface';

/**
 * Provided by wrapper components (`ui-button`). A directive on the same host injects it with
 * `inject(UI_FOCUS_TARGET, { optional: true, self: true })` and falls back to the host
 * `ElementRef` when it is absent.
 */
export const UI_FOCUS_TARGET = new InjectionToken<UiFocusTarget>('UI_FOCUS_TARGET');
