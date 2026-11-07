import { computed, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';
import { LandingMotionService } from '../landing-motion.service';

/**
 * Tells a scene when its loop may run: only while the element is in the viewport, the tab is
 * visible and the user has not asked for reduced motion. Use as a host directive.
 */
@Directive({
  selector: '[appLandingLoopGate]',
  exportAs: 'landingLoopGate',
})
export class LandingLoopGateDirective {
  private readonly motion = inject(LandingMotionService);
  private readonly inViewport = signal(false);

  /** True while the loop should run. */
  readonly active = computed(
    () => this.inViewport() && this.motion.tabVisible() && !this.motion.reducedMotion(),
  );

  constructor() {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      const latest = entries.at(-1);
      if (latest) {
        this.inViewport.set(latest.isIntersecting);
      }
    });
    observer.observe(inject<ElementRef<Element>>(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
