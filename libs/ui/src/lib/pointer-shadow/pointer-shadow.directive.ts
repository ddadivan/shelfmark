import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, Renderer2 } from '@angular/core';
import {
  POINTER_SHADOW_FINE_QUERY,
  POINTER_SHADOW_MAX_OFFSET_PX,
  POINTER_SHADOW_PROPERTY,
  POINTER_SHADOW_REDUCED_MOTION_QUERY,
} from './models/pointer-shadow.const';
import { POINTER_TYPE } from '../long-press/models/pointer-type.const';

/**
 * The hover shadow of a card leans away from the pointer, as if the pointer were a light: the
 * directive writes `--shadow-x` and `--shadow-y` (CSSOM `style.setProperty`, so no `style`
 * attribute and nothing for the CSP) and `ui-card` reads them in its hover shadow. The card
 * itself never moves. At most 6 px, updated once per animation frame.
 *
 * Nothing is attached when the device has no fine hovering pointer. The `pointermove` listener
 * exists only while a pointer is over the host. Under `prefers-reduced-motion` the shadow stays
 * where it is. The properties are removed when the pointer leaves and on destroy.
 *
 * `<ui-card uiPointerShadow>`
 */
@Directive({
  selector: '[uiPointerShadow]',
  exportAs: 'uiPointerShadow',
})
export class PointerShadowDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly view = inject(DOCUMENT).defaultView;

  private stopMove: (() => void) | null = null;
  private frame: number | null = null;
  private rect: DOMRect | null = null;
  private pending: { x: number; y: number } | null = null;

  constructor() {
    const unlisten: (() => void)[] = [];
    if (this.matches(POINTER_SHADOW_FINE_QUERY)) {
      unlisten.push(
        this.renderer.listen(this.host, 'pointerenter', (event: PointerEvent) => {
          this.onEnter(event);
        }),
        this.renderer.listen(this.host, 'pointerleave', () => {
          this.onLeave();
        }),
      );
    }
    inject(DestroyRef).onDestroy(() => {
      unlisten.forEach((fn) => {
        fn();
      });
      this.onLeave();
    });
  }

  private onEnter(event: PointerEvent): void {
    if (
      event.pointerType === POINTER_TYPE.Touch ||
      this.matches(POINTER_SHADOW_REDUCED_MOTION_QUERY) ||
      this.stopMove
    ) {
      return;
    }
    this.rect = this.host.getBoundingClientRect();
    this.queue(event);
    this.stopMove = this.renderer.listen(this.host, 'pointermove', (move: PointerEvent) => {
      this.queue(move);
    });
  }

  private onLeave(): void {
    this.stopMove?.();
    this.stopMove = null;
    if (this.frame !== null) {
      this.view?.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.pending = null;
    this.rect = null;
    this.host.style.removeProperty(POINTER_SHADOW_PROPERTY.X);
    this.host.style.removeProperty(POINTER_SHADOW_PROPERTY.Y);
  }

  /** Remembers the latest position; one frame applies it. */
  private queue(event: PointerEvent): void {
    this.pending = { x: event.clientX, y: event.clientY };
    if (this.frame === null && this.view) {
      this.frame = this.view.requestAnimationFrame(() => {
        this.frame = null;
        this.apply();
      });
    }
  }

  private apply(): void {
    const { pending, rect } = this;
    if (!pending || !rect || rect.width === 0 || rect.height === 0) {
      return;
    }
    const dx = clamp((pending.x - (rect.left + rect.width / 2)) / (rect.width / 2));
    const dy = clamp((pending.y - (rect.top + rect.height / 2)) / (rect.height / 2));
    // Away from the pointer: the shadow falls on the side opposite to it.
    this.host.style.setProperty(POINTER_SHADOW_PROPERTY.X, offset(-dx));
    this.host.style.setProperty(POINTER_SHADOW_PROPERTY.Y, offset(-dy));
  }

  private matches(query: string): boolean {
    return this.view?.matchMedia?.(query).matches ?? false;
  }
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function offset(unit: number): string {
  return `${(unit * POINTER_SHADOW_MAX_OFFSET_PX).toFixed(1)}px`;
}
