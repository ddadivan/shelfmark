import { afterNextRender, type Injector } from '@angular/core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Runs `update` (a state change that re-renders the page) inside a View Transition so elements
 * that share a `view-transition-name` glide from their old box to the new one. Without browser
 * support, or with reduced motion, `update` just runs and the view swaps. The callback waits
 * for the next Angular render, so the "new" snapshot is taken after the DOM changed (zoneless).
 */
export function runViewTransition(doc: Document, injector: Injector, update: () => void): void {
  const win = doc.defaultView;
  // No `matchMedia` (jsdom, odd embeds): treat as "no morph".
  const reduced =
    typeof win?.matchMedia === 'function' ? win.matchMedia(REDUCED_MOTION_QUERY).matches : true;
  if (reduced || !('startViewTransition' in doc)) {
    update();
    return;
  }
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        update();
        afterNextRender({ read: () => resolve() }, { injector });
      }),
  );
}
