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
    let observer: IntersectionObserver | undefined;
    let observerRoot: Element | null = null;
    effect(() => {
      this.recheck();
      // The scroll area the host sits in (the library list on a tablet or desktop), else the
      // viewport (the page scroll of a phone). Looked up on each check: the layout can change.
      const root = scrollParent(element);
      if (!observer || root !== observerRoot) {
        observer?.disconnect();
        observer = new observerType(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              this.entered.emit();
            }
          },
          { root, rootMargin: ROOT_MARGIN },
        );
        observerRoot = root;
      }
      observer.unobserve(element);
      observer.observe(element);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}

/** The nearest ancestor that scrolls vertically, or `null` when the page itself scrolls. */
function scrollParent(element: Element): Element | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }
  }
  return null;
}
