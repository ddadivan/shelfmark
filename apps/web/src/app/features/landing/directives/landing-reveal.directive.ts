import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';
import { LandingMotionService } from '../landing-motion.service';
import { LANDING_REVEAL } from '../models/landing-reveal.const';
import { LANDING_REVEAL_STATE } from '../models/landing-reveal-state.const';
import type { LandingRevealState } from '../models/landing-reveal-state.type';

const DELAY_PROPERTY = '--landing-reveal-delay';

/**
 * Reveals a section once when it first scrolls into view: its direct children fade in and rise,
 * staggered. Content is visible by default; it is only hidden after the browser can observe
 * scrolling, and never for users who prefer reduced motion. The styles come from the
 * `landing.reveal` mixin applied to the host in the component's stylesheet.
 */
@Directive({
  selector: '[appLandingReveal]',
  host: {
    '[class.landing-reveal--pending]': 'state() === STATE.Pending',
    '[class.landing-reveal--shown]': 'state() === STATE.Shown',
  },
})
export class LandingRevealDirective {
  protected readonly STATE = LANDING_REVEAL_STATE;
  protected readonly state = signal<LandingRevealState>(LANDING_REVEAL_STATE.Idle);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly motion = inject(LandingMotionService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    if (this.motion.reducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }
    Array.from(this.host.children).forEach((child, index) => {
      if (child instanceof HTMLElement) {
        child.style.setProperty(DELAY_PROPERTY, `${index * LANDING_REVEAL.StaggerMs}ms`);
      }
    });
    this.state.set(LANDING_REVEAL_STATE.Pending);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.state.set(LANDING_REVEAL_STATE.Shown);
          observer.disconnect();
        }
      },
      { threshold: LANDING_REVEAL.Threshold },
    );
    observer.observe(this.host);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
