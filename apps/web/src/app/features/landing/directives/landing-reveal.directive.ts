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
    '(focusin)': 'revealNow()',
  },
})
export class LandingRevealDirective {
  protected readonly STATE = LANDING_REVEAL_STATE;
  protected readonly state = signal<LandingRevealState>(LANDING_REVEAL_STATE.Idle);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly motion = inject(LandingMotionService);
  private readonly destroyRef = inject(DestroyRef);

  /** Shows the section at once (set while it is pending); used when focus lands inside it. */
  private showNow: (() => void) | undefined;

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    if (this.motion.reducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }
    if (this.isVisibleEnough(this.visiblePixels(), this.host.getBoundingClientRect().height)) {
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
      this.showNow = undefined;
      observer.disconnect();
      clearTimeout(safety);
    };
    this.showNow = reveal;
    const observer = new IntersectionObserver(
      (entries) => {
        // The observer reports, so the safety net is no longer needed: an off-screen section
        // stays hidden until it scrolls in, however long that takes.
        clearTimeout(safety);
        if (
          entries.some(
            (entry) =>
              entry.isIntersecting &&
              this.isVisibleEnough(entry.intersectionRect.height, entry.boundingClientRect.height),
          )
        ) {
          reveal();
        }
      },
      // 0 reports the first overlap, so a section taller than five screens (it can never reach
      // 20% visible) is still seen; the Threshold fires for the usual case.
      { threshold: [0, LANDING_REVEAL.Threshold] },
    );
    // Never leave content hidden if the observer does not report at all; the first report
    // clears this timer.
    const safety = setTimeout(reveal, LANDING_REVEAL.SafetyMs);
    observer.observe(this.host);
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      clearTimeout(safety);
    });
  }

  /** Keyboard focus inside a hidden section must never land on invisible content. */
  protected revealNow(): void {
    this.showNow?.();
  }

  /**
   * Enough is visible when it is at least the threshold share of the section, or of the
   * viewport: a section taller than `1 / Threshold` viewports can never reach the first.
   */
  private isVisibleEnough(visiblePixels: number, sectionHeight: number): boolean {
    if (sectionHeight <= 0 || visiblePixels <= 0) {
      return false;
    }
    const threshold = LANDING_REVEAL.Threshold;
    return (
      visiblePixels >= sectionHeight * threshold ||
      visiblePixels >= this.viewportHeight() * threshold
    );
  }

  /** Height of the host already inside the viewport (0 when it has no size yet). */
  private visiblePixels(): number {
    const { top, bottom } = this.host.getBoundingClientRect();
    return Math.min(bottom, this.viewportHeight()) - Math.max(top, 0);
  }

  private viewportHeight(): number {
    return this.host.ownerDocument.defaultView?.innerHeight ?? 0;
  }
}
