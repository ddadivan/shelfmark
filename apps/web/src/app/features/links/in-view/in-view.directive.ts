import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

/** Margin that makes the sentinel fire a little before it is on screen. */
const ROOT_MARGIN = '0px 0px 320px 0px';

/**
 * Emits `entered` each time the host scrolls into (or near) the viewport; the feed puts it on
 * a sentinel under the last item to load the next page. Without `IntersectionObserver` it does
 * nothing and the visible "Load more" button is the way on.
 */
@Directive({
  selector: '[appInView]',
})
export class InViewDirective {
  readonly entered = output<void>();

  constructor() {
    const observerType = globalThis.IntersectionObserver as typeof IntersectionObserver | undefined;
    if (observerType === undefined) {
      return;
    }
    const observer = new observerType(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.entered.emit();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(inject<ElementRef<Element>>(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
