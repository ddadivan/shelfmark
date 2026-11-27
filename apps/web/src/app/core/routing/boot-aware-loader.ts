import { computed, inject, type Signal } from '@angular/core';
import { loaderVisible } from '@shelfmark/ui';
import { BootHandover } from './boot-handover.service';

/**
 * `loaderVisible` for the first load of a page that may open under the static app skeleton of
 * `index.html` (#410). That skeleton goes away right after the first render (`App`), so a loader
 * that waits 300 ms (Loading spec) would leave a blank feed between the two. While the page is
 * the one the app opened on (`BootHandover`), the loader is visible at once; every later load
 * keeps the 300 ms rule. Call it in an injection context.
 */
export function bootAwareLoader(busy: Signal<boolean>): Signal<boolean> {
  const delayed = loaderVisible(busy);
  const handover = inject(BootHandover).active;
  return computed(() => (handover() && busy()) || delayed());
}
