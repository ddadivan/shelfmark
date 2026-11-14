import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';
import { LandingMotionService } from '../services/landing-motion.service';
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
    // Nothing is read synchronously (no layout flush at startup): the observer's first report,
    // which the browser delivers after layout anyway, decides whether the section starts hidden.
    // Until then the content stays visible, so a section that never gets a report is never hidden.
    let pendingSet = false;
    const reveal = (): void => {
      this.state.set(LANDING_REVEAL_STATE.Shown);
      this.showNow = undefined;
      observer.disconnect();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) =>
            entry.isIntersecting &&
            this.isVisibleEnough(
              entry.intersectionRect.height,
              entry.boundingClientRect.height,
              entry.rootBounds?.height ?? this.viewportHeight(),
            ),
        );
        if (!pendingSet) {
          if (visible) {
            // Already on screen at load: never hidden, nothing more to watch.
            observer.disconnect();
            return;
          }
          pendingSet = true;
          Array.from(this.host.children).forEach((child, index) => {
            if (child instanceof HTMLElement) {
              child.style.setProperty(DELAY_PROPERTY, `${index * LANDING_REVEAL.StaggerMs}ms`);
            }
          });
          this.showNow = reveal;
          this.state.set(LANDING_REVEAL_STATE.Pending);
        } else if (visible) {
          reveal();
        }
      },
      // 0 reports the first overlap, so a section taller than five screens (it can never reach
      // 20% visible) is still seen; the Threshold fires for the usual case.
      { threshold: [0, LANDING_REVEAL.Threshold] },
    );
    observer.observe(this.host);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Keyboard focus inside a hidden section must never land on invisible content. */
  protected revealNow(): void {
    this.showNow?.();
  }

  /**
   * Enough is visible when it is at least the threshold share of the section, or of the
   * viewport: a section taller than `1 / Threshold` viewports can never reach the first.
   */
  private isVisibleEnough(
    visiblePixels: number,
    sectionHeight: number,
    viewportHeight: number,
  ): boolean {
    if (sectionHeight <= 0 || visiblePixels <= 0) {
      return false;
    }
    const threshold = LANDING_REVEAL.Threshold;
    return (
      visiblePixels >= sectionHeight * threshold || visiblePixels >= viewportHeight * threshold
    );
  }

  private viewportHeight(): number {
    return this.host.ownerDocument.defaultView?.innerHeight ?? 0;
  }
}
