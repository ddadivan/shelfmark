import { DestroyRef, DOCUMENT, inject, Service, signal } from '@angular/core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const HIDDEN = 'hidden';

/**
 * Environment facts the landing animations depend on: whether the user asked for reduced
 * motion and whether the tab is visible. Listeners are removed when the injector is destroyed.
 */
@Service()
export class LandingMotionService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reducedSignal = signal(false);
  private readonly visibleSignal = signal(this.document.visibilityState !== HIDDEN);

  readonly reducedMotion = this.reducedSignal.asReadonly();
  readonly tabVisible = this.visibleSignal.asReadonly();

  constructor() {
    const query = this.document.defaultView?.matchMedia?.(REDUCED_MOTION_QUERY);
    if (query) {
      this.reducedSignal.set(query.matches);
      const onChange = (event: MediaQueryListEvent): void => this.reducedSignal.set(event.matches);
      query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }

    const onVisibility = (): void =>
      this.visibleSignal.set(this.document.visibilityState !== HIDDEN);
    this.document.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', onVisibility),
    );
  }
}
