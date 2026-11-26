import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';

/**
 * Runs `handler` when the page is going away (`pagehide`: tab closed, navigated away, moved to the
 * back/forward cache). Call in an injection context; the listener is removed with the caller.
 */
export function onPageHide(handler: () => void): void {
  const view = inject(DOCUMENT).defaultView;
  if (!view) return;
  view.addEventListener('pagehide', handler);
  inject(DestroyRef).onDestroy(() => view.removeEventListener('pagehide', handler));
}
