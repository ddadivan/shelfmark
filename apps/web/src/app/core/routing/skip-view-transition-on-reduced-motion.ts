import { DOCUMENT } from '@angular/common';
import { inject, Injector } from '@angular/core';
import type { ViewTransitionInfo } from '@angular/router';
import {
  canRunViewTransition,
  prefersReducedMotion,
  settleViewTransition,
} from '../../features/library/utils/view-transition';
import { onlySplitChanged } from './only-split-changed';

/**
 * `onViewTransitionCreated` of the router's page cross-fade (`withViewTransitions`): with
 * reduced motion (the device or the Animations setting), or while the tab is hidden, the
 * transition is skipped, so the page swaps at once. Its promises are settled either way: a
 * transition that was skipped or aborted by a newer navigation (the sign-in redirect) must not
 * leave an unhandled `InvalidStateError` in the console.
 */
export function skipViewTransitionOnReducedMotion(info: ViewTransitionInfo): void {
  const doc = inject(DOCUMENT);
  settleViewTransition(info.transition);
  if (
    prefersReducedMotion(doc, inject(Injector)) ||
    !canRunViewTransition(doc) ||
    // Opening, closing or changing the right half (`?split`) is no page change: no cross-fade.
    (info.from && info.to && onlySplitChanged(info.from, info.to))
  ) {
    info.transition.skipTransition();
  }
}
