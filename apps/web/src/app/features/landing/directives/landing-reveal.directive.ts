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
    if (this.visibleShare() >= LANDING_REVEAL.Threshold) {
      return;
    }
    Array.from(this.host.children).forEach((child, index) => {
      if (child instanceof HTMLElement) {
        child.style.setProperty(DELAY_PROPERTY, `${index * LANDING_REVEAL.StaggerMs}ms`);
      }
    });
    this.state.set(LANDING_REVEAL_STATE.Pending);

    const reveal = (): void => {
      this.state.set(LANDING_REVEAL_STATE.Shown);
      observer.disconnect();
      clearTimeout(safety);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        // The observer reports, so the safety net is no longer needed: an off-screen section
        // stays hidden until it scrolls in, however long that takes.
        clearTimeout(safety);
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
        }
      },
      { threshold: LANDING_REVEAL.Threshold },
    );
    // Never leave content hidden if the observer does not report at all (cleared on its first report).
    const safety = setTimeout(reveal, LANDING_REVEAL.SafetyMs);
    observer.observe(this.host);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      clearTimeout(safety);
    });
  }

  /** Share of the host already inside the viewport (0 when it has no size yet). */
  private visibleShare(): number {
    const { top, bottom, height } = this.host.getBoundingClientRect();
    if (height <= 0) {
      return 0;
    }
    const viewport = this.host.ownerDocument.defaultView?.innerHeight ?? 0;
    return (Math.min(bottom, viewport) - Math.max(top, 0)) / height;
  }
}
