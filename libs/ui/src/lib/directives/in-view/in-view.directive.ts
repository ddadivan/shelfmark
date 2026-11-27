import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { InViewObserver } from './in-view-observer';
import type { InViewRoot } from './models/in-view-root.type';

/**
 * Tells whether its host is in (or near) the viewport or a scroll container: the `inView` signal
 * (`exportAs="uiInView"`, also as a host directive) and `entered`, emitted each time the host
 * comes into view. An observer only reports changes, so a host that stays in view after a page
 * loads would never fire again: bind `recheck` to something that changes per load (the item
 * count) and the host is observed afresh, which reports its current state at once. Without
 * `IntersectionObserver` it does nothing (`inView` stays false).
 *
 * `root` is `'scroll-parent'` (the nearest scrolling ancestor, looked up on each check since the
 * layout can change), an element, or `null` for the viewport (default); `threshold` and `margin`
 * are the observer's.
 */
@Directive({
  selector: '[uiInView]',
  exportAs: 'uiInView',
})
export class UiInViewDirective {
  readonly root = input<InViewRoot>(null, { alias: 'uiInViewRoot' });
  readonly threshold = input<number | readonly number[]>(0, { alias: 'uiInViewThreshold' });
  /** `rootMargin` of the observer. */
  readonly margin = input('0px', { alias: 'uiInViewMargin' });
  /** Any value; each change re-checks whether the host is in view. */
  readonly recheck = input<unknown>(undefined, { alias: 'uiInViewRecheck' });

  /** The host came into view. */
  readonly entered = output<void>();

  private readonly inViewState = signal(false);
  /** The host is in view (by the latest report). */
  readonly inView = this.inViewState.asReadonly();

  constructor() {
    const observer = new InViewObserver(
      inject<ElementRef<Element>>(ElementRef).nativeElement,
      (entries) => {
        const latest = entries.at(-1);
        if (latest) {
          this.inViewState.set(latest.isIntersecting);
        }
        if (entries.some((entry) => entry.isIntersecting)) {
          this.entered.emit();
        }
      },
    );
    effect(() => {
      this.recheck();
      observer.start({ root: this.root(), threshold: this.threshold(), margin: this.margin() });
    });
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
    });
  }
}
