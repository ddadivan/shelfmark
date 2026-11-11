import { DOCUMENT } from '@angular/common';
import { inject, Injector } from '@angular/core';
import type { ViewTransitionInfo } from '@angular/router';
import { prefersReducedMotion } from '../../features/library/view-transition';

/**
 * `onViewTransitionCreated` of the router's page cross-fade (`withViewTransitions`): with
 * reduced motion (the device or the Animations setting) the transition is skipped, so the page swaps at once.
 */
export function skipViewTransitionOnReducedMotion(info: ViewTransitionInfo): void {
  if (prefersReducedMotion(inject(DOCUMENT), inject(Injector))) {
    info.transition.skipTransition();
  }
}
