import { afterNextRender, type Injector } from '@angular/core';
import { ReducedMotion } from '@shelfmark/ui';

/** Turns the per-item `view-transition-name`s on for the duration of one transition. */
export interface ViewTransitionNames {
  on(): void;
  off(): void;
}

/**
 * Whether motion should be left out: the device or the Animations setting asks for less
 * (`ReducedMotion`); without `matchMedia` (jsdom, odd embeds) assume so.
 */
export function prefersReducedMotion(doc: Document, injector: Injector): boolean {
  return typeof doc.defaultView?.matchMedia !== 'function' || injector.get(ReducedMotion).reduced();
}

/** Whether a transition can run now: a hidden tab cannot paint one, the browser aborts it. */
export function canRunViewTransition(doc: Document): boolean {
  return doc.visibilityState !== 'hidden';
}

/**
 * A skipped or aborted transition (a newer one started, the tab went to the background, the page
 * changed under it) rejects `ready`, `updateCallbackDone` and `finished` with an `AbortError` or
 * `InvalidStateError`. That is expected, not a failure: nobody awaits the animation, so the
 * rejections are swallowed here and never reach the console as unhandled.
 */
export function settleViewTransition(transition: ViewTransition): void {
  const ignore = (): void => undefined;
  transition.ready.catch(ignore);
  transition.updateCallbackDone.catch(ignore);
  transition.finished.catch(ignore);
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
  if (
    prefersReducedMotion(doc, injector) ||
    !('startViewTransition' in doc) ||
    !canRunViewTransition(doc)
  ) {
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
    settleViewTransition(transition);
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
