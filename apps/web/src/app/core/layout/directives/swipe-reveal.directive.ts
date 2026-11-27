import { DestroyRef, Directive, ElementRef, effect, inject, input, signal } from '@angular/core';

/** A drag of this many pixels (sideways, more than up or down) starts the swipe. */
const SWIPE_START_PX = 8;

/**
 * Swipe-left-to-reveal for a phone row (Trash, Recently opened): the host (the row's surface)
 * slides aside by `offset` pixels to show the action buttons waiting behind it. The buttons stay
 * in the DOM, so keyboard and screen reader users never need the swipe: focusing one opens the
 * row, leaving them closes it. A vertical drag is left to the page scroll; the click that ends a
 * drag is swallowed (`takeClick()`).
 *
 * Put it on the surface element: `[appSwipeReveal]="enabled"` (usually "is a phone") and
 * `[appSwipeRevealActions]="actionsElement"` (its width is how far the row opens). The host
 * captures the pointer while dragging and is moved through `translate`. Read the state with
 * `#swipe="appSwipeReveal"`.
 */
@Directive({
  selector: '[appSwipeReveal]',
  exportAs: 'appSwipeReveal',
  host: {
    '[style.translate.px]': 'offset()',
    '(pointerdown)': 'pointerDown($event)',
    '(pointermove)': 'pointerMove($event)',
    '(pointerup)': 'pointerEnd()',
    '(pointercancel)': 'pointerEnd()',
  },
})
export class SwipeRevealDirective {
  /** Swiping is on (the focus behaviour of the actions always works). */
  readonly enabled = input(true, { alias: 'appSwipeReveal' });
  /** The element with the action buttons behind the surface. */
  readonly actions = input<HTMLElement | undefined>(undefined, { alias: 'appSwipeRevealActions' });

  /** How far the surface is moved: 0 closed, negative open. */
  readonly offset = signal(0);
  readonly dragging = signal(false);
  readonly open = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private start: { x: number; y: number; base: number } | null = null;
  private suppressClick = false;
  private clickTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect((onCleanup) => {
      const actions = this.actions();
      if (!actions) {
        return;
      }
      const focusIn = (): void => this.setOpen(true);
      const focusOut = (event: FocusEvent): void => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !actions.contains(next)) {
          this.setOpen(false);
        }
      };
      actions.addEventListener('focusin', focusIn);
      actions.addEventListener('focusout', focusOut);
      onCleanup(() => {
        actions.removeEventListener('focusin', focusIn);
        actions.removeEventListener('focusout', focusOut);
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.clickTimer));
  }

  /** True right after a drag ended: the click that follows the release must do nothing. */
  takeClick(): boolean {
    return this.suppressClick;
  }

  setOpen(open: boolean): void {
    this.open.set(open);
    this.offset.set(open ? -this.width() : 0);
  }

  protected pointerDown(event: PointerEvent): void {
    if (!this.enabled() || !event.isPrimary || event.button !== 0) {
      return;
    }
    this.start = { x: event.clientX, y: event.clientY, base: this.open() ? -this.width() : 0 };
  }

  protected pointerMove(event: PointerEvent): void {
    const start = this.start;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!this.dragging()) {
      if (Math.abs(dy) > SWIPE_START_PX && Math.abs(dy) >= Math.abs(dx)) {
        this.start = null;
        return;
      }
      if (Math.abs(dx) <= SWIPE_START_PX) {
        return;
      }
      this.dragging.set(true);
      this.host.setPointerCapture(event.pointerId);
    }
    this.offset.set(Math.min(0, Math.max(-this.width(), start.base + dx)));
  }

  protected pointerEnd(): void {
    if (this.dragging()) {
      this.dragging.set(false);
      this.setOpen(this.offset() < -this.width() / 2);
      // The click that may follow the release belongs to the drag.
      this.suppressClick = true;
      clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => (this.suppressClick = false));
    }
    this.start = null;
  }

  private width(): number {
    return this.actions()?.offsetWidth ?? 0;
  }
}
