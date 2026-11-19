import {
  afterRenderEffect,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

/** The stacked layout's host class, set by `ui-bulk-bar`. */
const STACKED_CLASS = 'ui-bulk-bar--stacked';
const BAR_SELECTOR = '.ui-bulk-bar__bar';

/**
 * Picks the bulk bar's layout by the room it has, not only by the phone (#267 follow-up): on a
 * narrow desktop window (about 1100–1280px, longer languages such as Ukrainian or German) the
 * inline bar is wider than the feed and its last buttons were cut off. While `stacked()` is true
 * the page shows the stacked layout (icon above label, equal widths), which always fits.
 *
 * The inline bar measures what it needs (`scrollWidth` of the bar, which scrolls inside itself
 * when it overflows); stacked, it goes back to inline once the parent's content box is at least
 * that wide again. New actions (`appBulkBarFit`, the action list) are measured inline again. All
 * measuring runs after render, before paint, so the switch never flickers. A `ResizeObserver` on
 * the parent and the bar re-measures on every size change.
 */
@Directive({
  selector: 'ui-bulk-bar[appBulkBarFit]',
  exportAs: 'appBulkBarFit',
})
export class BulkBarFitDirective {
  /** What the bar shows (its actions): a change is measured inline again. */
  readonly appBulkBarFit = input<unknown>();

  private readonly stackedState = signal(false);
  /** The inline bar does not fit: the page shows the stacked layout. */
  readonly stacked = this.stackedState.asReadonly();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Bumped by the `ResizeObserver`, so the measure runs again. */
  private readonly resized = signal(0);
  /** Width the inline bar needs, from its last inline measure. */
  private needed = 0;
  private measured: unknown = undefined;

  constructor() {
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => this.resized.update((n) => n + 1));
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
    let observing = false;

    afterRenderEffect({
      read: () => {
        const content = this.appBulkBarFit();
        this.resized();
        const bar = this.host.querySelector<HTMLElement>(BAR_SELECTOR);
        if (!bar) {
          return;
        }
        if (observer && !observing) {
          observing = true;
          observer.observe(bar);
          if (this.host.parentElement) {
            observer.observe(this.host.parentElement);
          }
        }
        const stackedNow = this.host.classList.contains(STACKED_CLASS);
        if (stackedNow && content !== this.measured) {
          // Different actions need a different width: show them inline once to measure.
          this.stackedState.set(false);
          return;
        }
        this.measured = content;
        if (!stackedNow) {
          this.needed = bar.scrollWidth;
          this.stackedState.set(bar.scrollWidth > bar.clientWidth + 1);
          return;
        }
        this.stackedState.set(this.available() < this.needed);
      },
    });
  }

  /** The parent's content-box width: the most the bar may take. */
  private available(): number {
    const parent = this.host.parentElement;
    if (!parent) {
      return Number.POSITIVE_INFINITY;
    }
    const style = getComputedStyle(parent);
    return (
      parent.clientWidth -
      (Number.parseFloat(style.paddingInlineStart) || 0) -
      (Number.parseFloat(style.paddingInlineEnd) || 0)
    );
  }
}
