import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { REDUCED_MOTION_QUERY } from './models/reduced-motion-query.const';

/**
 * The one answer to "should this move?" for script-driven motion (ripple, pointer shadow, View
 * Transitions, autoplay, landing animations): true when the device asks for reduced motion
 * (`prefers-reduced-motion: reduce`, followed live) or the app's own setting does
 * (`setAppReduced`, called by the app's ThemeService together with `html[data-motion]`, which the
 * `reduced-motion` Sass mixin reads). The app setting can only add a reduction, never remove the
 * device's. Without `matchMedia` the device is taken as not asking.
 */
@Service()
export class ReducedMotion {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly system = signal(false);
  private readonly app = signal(false);

  /** Movement should be left out. */
  readonly reduced = computed(() => this.system() || this.app());

  constructor() {
    const query =
      typeof this.view?.matchMedia === 'function'
        ? this.view.matchMedia(REDUCED_MOTION_QUERY)
        : null;
    if (query) {
      this.system.set(query.matches);
      const onChange = (event: MediaQueryListEvent): void => this.system.set(event.matches);
      query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
    }
  }

  /** The app's "Animations: Reduced" setting. */
  setAppReduced(reduced: boolean): void {
    this.app.set(reduced);
  }
}
