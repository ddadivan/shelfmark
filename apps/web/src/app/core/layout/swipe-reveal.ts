import { signal } from '@angular/core';

/** A drag of this many pixels (sideways, more than up or down) starts the swipe. */
const SWIPE_START_PX = 8;

/**
 * Swipe-left-to-reveal for a phone row (Trash, Recently opened): the row's surface slides aside by
 * `offset` pixels to show the action buttons waiting behind it. The buttons stay in the DOM, so
 * keyboard and screen reader users never need the swipe: focusing one opens the row, leaving them
 * closes it. A vertical drag is left to the page scroll; the click that ends a drag is swallowed
 * (`takeClick()`).
 *
 * The owner passes `enabled` (usually "is a phone"), the actions element (its width is how far the
 * row opens) and the surface element (it captures the pointer while dragging), and binds the
 * pointer and focus handlers in its template.
 */
export class SwipeReveal {
  /** How far the surface is moved: 0 closed, negative open. */
  readonly offset = signal(0);
  readonly dragging = signal(false);
  readonly open = signal(false);
  private start: { x: number; y: number; base: number } | null = null;
  private suppressClick = false;

  constructor(
    private readonly enabled: () => boolean,
    private readonly actions: () => HTMLElement | undefined,
    private readonly surface: () => HTMLElement | undefined,
  ) {}

  /** True right after a drag ended: the click that follows the release must do nothing. */
  takeClick(): boolean {
    return this.suppressClick;
  }

  setOpen(open: boolean): void {
    this.open.set(open);
    this.offset.set(open ? -this.width() : 0);
  }

  pointerDown(event: PointerEvent): void {
    if (!this.enabled() || !event.isPrimary || event.button !== 0) {
      return;
    }
    this.start = { x: event.clientX, y: event.clientY, base: this.open() ? -this.width() : 0 };
  }

  pointerMove(event: PointerEvent): void {
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
      this.surface()?.setPointerCapture(event.pointerId);
    }
    this.offset.set(Math.min(0, Math.max(-this.width(), start.base + dx)));
  }

  pointerEnd(): void {
    if (this.dragging()) {
      this.dragging.set(false);
      this.setOpen(this.offset() < -this.width() / 2);
      // The click that may follow the release belongs to the drag.
      this.suppressClick = true;
      setTimeout(() => (this.suppressClick = false));
    }
    this.start = null;
  }

  focusIn(): void {
    this.setOpen(true);
  }

  focusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.actions()?.contains(next)) {
      this.setOpen(false);
    }
  }

  private width(): number {
    return this.actions()?.offsetWidth ?? 0;
  }
}
