import { DestroyRef, Directive, effect, ElementRef, inject, input, output } from '@angular/core';

/** Margin that makes the sentinel fire a little before it is on screen. */
const ROOT_MARGIN = '0px 0px 320px 0px';

/**
 * Emits `entered` each time the host scrolls into (or near) the viewport; the feed puts it on
 * a sentinel under the last item to load the next page. An observer only reports changes, so a
 * sentinel that stays in view after a page loads would never fire again: bind `recheck` to
 * something that changes per load (the item count) and the host is observed afresh, which
 * reports its current state at once. Without `IntersectionObserver` it does nothing and the
 * visible "Load more" button is the way on.
 */
@Directive({
  selector: '[appInView]',
})
export class InViewDirective {
  readonly entered = output<void>();
  /** Any value; each change re-checks whether the host is in view. */
  readonly recheck = input<unknown>(undefined, { alias: 'appInViewRecheck' });

  constructor() {
    const observerType = globalThis.IntersectionObserver as typeof IntersectionObserver | undefined;
    if (observerType === undefined) {
      return;
    }
    const element = inject<ElementRef<Element>>(ElementRef).nativeElement;
    const observer = new observerType(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.entered.emit();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    effect(() => {
      this.recheck();
      observer.unobserve(element);
      observer.observe(element);
    });
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
