import type { Injector } from '@angular/core';

export interface LoaderTimingOptions {
  /** Wait (ms) before the loader appears. Default `LOADER_SHOW_DELAY_MS` (300). */
  delay?: number;
  /** Minimum time (ms) the loader stays once shown. Default `LOADER_MIN_VISIBLE_MS` (400). */
  minVisible?: number;
  /** Injector for a call outside an injection context. */
  injector?: Injector;
}
