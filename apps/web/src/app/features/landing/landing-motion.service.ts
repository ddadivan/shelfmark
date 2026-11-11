import { DestroyRef, DOCUMENT, inject, Service, signal } from '@angular/core';
import { ReducedMotion } from '@shelfmark/ui';

const HIDDEN = 'hidden';

/**
 * Environment facts the landing animations depend on: whether reduced motion is asked for
 * (the device or the Animations setting) and whether the tab is visible. Listeners are removed when the injector is destroyed.
 */
@Service()
export class LandingMotionService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly visibleSignal = signal(this.document.visibilityState !== HIDDEN);

  /** The device or the Animations setting asks for less motion (`ReducedMotion`). */
  readonly reducedMotion = inject(ReducedMotion).reduced;
  readonly tabVisible = this.visibleSignal.asReadonly();

  constructor() {
    const onVisibility = (): void =>
      this.visibleSignal.set(this.document.visibilityState !== HIDDEN);
    this.document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', onVisibility),
    );
  }
}
