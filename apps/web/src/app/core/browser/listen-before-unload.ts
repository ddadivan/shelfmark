import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';

/**
 * While `active()` holds, closing or reloading the tab asks the browser's own (generic) "Leave
 * site?" prompt. Call in an injection context; the listener goes with the caller.
 */
export function listenBeforeUnload(active: () => boolean): void {
  const view = inject(DOCUMENT).defaultView;
  if (!view) return;
  const listener = (event: BeforeUnloadEvent): void => {
    if (active()) {
      event.preventDefault();
      // Older browsers read returnValue; its text is never shown.
      event.returnValue = '';
    }
  };
  view.addEventListener('beforeunload', listener);
  inject(DestroyRef).onDestroy(() => view.removeEventListener('beforeunload', listener));
}
