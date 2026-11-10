import { afterNextRender, type Injector } from '@angular/core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Turns the per-item `view-transition-name`s on for the duration of one transition. */
export interface ViewTransitionNames {
  on(): void;
  off(): void;
}

/** Whether the user asked for less motion; without `matchMedia` (jsdom, odd embeds) assume so. */
export function prefersReducedMotion(doc: Document): boolean {
  const win = doc.defaultView;
  return typeof win?.matchMedia === 'function'
    ? win.matchMedia(REDUCED_MOTION_QUERY).matches
    : true;
}

/**
 * Runs `update` (a state change that re-renders the page) inside a View Transition so elements
 * that share a `view-transition-name` glide from their old box to the new one. Without browser
 * support, or with reduced motion, `update` just runs and the view swaps. The callback waits
 * for the next Angular render, so the "new" snapshot is taken after the DOM changed (zoneless).
 *
 * `names` scopes the names: they are on only while this transition runs (set before the old
 * snapshot is taken, cleared when it finishes), so they cannot disturb the router's page
 * transition (`withViewTransitions`), where the same link ids would otherwise glide across pages.
 */
export function runViewTransition(
  doc: Document,
  injector: Injector,
  update: () => void,
  names?: ViewTransitionNames,
): void {
  if (prefersReducedMotion(doc) || !('startViewTransition' in doc)) {
    update();
    return;
  }
  const start = (): void => {
    const transition = doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          update();
          afterNextRender({ read: () => resolve() }, { injector });
        }),
    );
    if (names) {
      const off = (): void => names.off();
      void transition.finished.then(off, off);
    }
  };
  if (names) {
    names.on();
    // The old snapshot must already see the names: wait for the render that sets them.
    afterNextRender({ read: start }, { injector });
  } else {
    start();
  }
}
