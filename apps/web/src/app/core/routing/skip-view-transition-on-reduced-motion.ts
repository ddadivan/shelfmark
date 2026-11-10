import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import type { ViewTransitionInfo } from '@angular/router';
import { prefersReducedMotion } from '../../features/library/view-transition';

/**
 * `onViewTransitionCreated` of the router's page cross-fade (`withViewTransitions`): with
 * `prefers-reduced-motion` the transition is skipped, so the page swaps at once.
 */
export function skipViewTransitionOnReducedMotion(info: ViewTransitionInfo): void {
  if (prefersReducedMotion(inject(DOCUMENT))) {
    info.transition.skipTransition();
  }
}
