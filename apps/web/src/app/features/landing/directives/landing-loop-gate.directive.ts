import { computed, Directive, inject } from '@angular/core';
import { UiInViewDirective } from '@shelfmark/ui';
import { LandingMotionService } from '../services/landing-motion.service';

/**
 * Tells a scene when its loop may run: only while the element is in the viewport, the tab is
 * visible and the user has not asked for reduced motion. Use as a host directive.
 */
@Directive({
  selector: '[appLandingLoopGate]',
  hostDirectives: [UiInViewDirective],
})
export class LandingLoopGateDirective {
  private readonly motion = inject(LandingMotionService);
  private readonly view = inject(UiInViewDirective);

  /** True while the loop should run. */
  readonly active = computed(
    () => this.view.inView() && this.motion.tabVisible() && !this.motion.reducedMotion(),
  );
}
