import { inject, Service } from '@angular/core';
import { pageVisible, ReducedMotion } from '@shelfmark/ui';

/**
 * Environment facts the landing animations depend on: whether reduced motion is asked for
 * (the device or the Animations setting) and whether the tab is visible. Listeners are removed when the injector is destroyed.
 */
@Service()
export class LandingMotionService {
  /** The device or the Animations setting asks for less motion (`ReducedMotion`). */
  readonly reducedMotion = inject(ReducedMotion).reduced;
  readonly tabVisible = pageVisible();
}
