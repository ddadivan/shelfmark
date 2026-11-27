import { DestroyRef, DOCUMENT, inject, Service, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { APP_PATH } from '../../models/app-path.const';
import { BOOT_SKELETON_SELECTOR } from './models/boot-skeleton-selector.const';
import { urlPath } from './url-path';

/**
 * Whether the page the app opened on still stands in for the static app skeleton of `index.html`
 * (#410): true when that skeleton was up at start, until the first navigation away from the page
 * it led into (the demo start only forwards, it does not count). A first load on that page shows
 * its own skeleton at once (`bootAwareLoader`), so the picture goes skeleton, skeleton, content
 * without a blank frame. `App` injects it, so it is created before the skeleton is removed.
 */
@Service()
export class BootHandover {
  /** True from the start under the app skeleton until the first navigation off the landing page. */
  readonly active = signal(inject(DOCUMENT).querySelector(BOOT_SKELETON_SELECTOR) !== null);

  constructor() {
    if (!this.active()) {
      return;
    }
    let landed = false;
    const subscription = inject(Router).events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        landed ||= urlPath(event.urlAfterRedirects) !== `/${APP_PATH.Demo}`;
      } else if (event instanceof NavigationStart && landed) {
        this.active.set(false);
        subscription.unsubscribe();
      }
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}
