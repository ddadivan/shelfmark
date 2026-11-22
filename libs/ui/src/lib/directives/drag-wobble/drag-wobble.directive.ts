import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, type OnInit, output } from '@angular/core';
import { ReducedMotion } from '../../services/motion/reduced-motion.service';
import { DragWobble } from '../../utils/spring/drag-wobble';
import { DRAG_WOBBLE } from '../../utils/spring/models/drag-wobble.const';
import type { FrameScheduler } from '../../utils/spring/models/frame-scheduler.interface';

/**
 * Physics for a drag preview (Motion «Drag a link», #562). Put it on an inner wrapper of a CDK
 * `cdkDragPreview` template: it lives exactly as long as the drag. While it exists, every pointer
 * or touch move of the document feeds `DragWobble`, which tilts the wrapper with a damped spring
 * (only `transform`, CSSOM). The wrapper's CSS sets `transform-origin` (the grab point) and any
 * static tilt of its children; the wobble adds on top.
 *
 * On release the owner calls `settle()` (the preview goes back to its slot: the tilt springs to
 * rest) or `flyTo(target, slot)` (the preview flies into `target`). Nothing moves under reduced
 * motion or the app's «Animations: Reduced» (`ReducedMotion`): `flyTo` then answers false.
 * `uiDragWobbleAttached` hands the directive to the owner once it is created.
 *
 * `<div class="preview__wobble" uiDragWobble (uiDragWobbleAttached)="drag.attach($event)">`
 */
@Directive({
  selector: '[uiDragWobble]',
  exportAs: 'uiDragWobble',
})
export class DragWobbleDirective implements OnInit {
  /** Emits the directive once, after it is created. */
  readonly attached = output<DragWobbleDirective>({ alias: 'uiDragWobbleAttached' });

  /** The wrapper the wobble moves. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly document = inject(DOCUMENT);
  private readonly wobble: DragWobble | null;

  constructor() {
    const view = this.document.defaultView;
    const reduced = inject(ReducedMotion).reduced();
    if (reduced || typeof view?.requestAnimationFrame !== 'function') {
      this.wobble = null;
      return;
    }
    const scheduler: FrameScheduler = {
      request: (callback) => view.requestAnimationFrame(callback),
      cancel: (id) => {
        view.cancelAnimationFrame(id);
      },
    };
    const wobble = new DragWobble(this.element, scheduler);
    this.wobble = wobble;
    const now = (): number => view.performance.now();
    const onPointer = (event: PointerEvent): void => {
      wobble.move(event.clientX, event.clientY, now());
    };
    const onTouch = (event: TouchEvent): void => {
      const touch = event.touches.item(0);
      if (touch) {
        wobble.move(touch.clientX, touch.clientY, now());
      }
    };
    const options = { capture: true, passive: true };
    this.document.addEventListener('pointermove', onPointer, options);
    this.document.addEventListener('touchmove', onTouch, options);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('pointermove', onPointer, options);
      this.document.removeEventListener('touchmove', onTouch, options);
      wobble.stop();
    });
  }

  ngOnInit(): void {
    this.attached.emit(this);
  }

  /** The wobble runs (false under reduced motion). */
  get active(): boolean {
    return this.wobble !== null;
  }

  /** The drag ended without a target: the tilt springs back to rest. */
  settle(): void {
    this.wobble?.settle();
  }

  /**
   * The drag ended over `target` while the drag's root moves back to `slot` (the CDK animates it
   * there with the same 320 ms `ease-in-out`): the wrapper translates by the difference, shrinks
   * to `DRAG_WOBBLE.FlyScale` and fades, so together they travel one straight line into the
   * target's centre. False (nothing moved) under reduced motion or without a measurable preview.
   */
  flyTo(target: DOMRect, slot: DOMRect): boolean {
    const root = this.element.parentElement;
    const body = unionRect(Array.from(this.element.children));
    if (!this.wobble || !root || !body) {
      return false;
    }
    this.wobble.stop();
    const rootBox = root.getBoundingClientRect();
    const [originX, originY] = parseOrigin(
      this.document.defaultView?.getComputedStyle(this.element).transformOrigin,
      this.element,
    );
    // Where the body's centre sits inside the root, and where it ends without a transform.
    const centreX = body.left + body.width / 2 - rootBox.left;
    const centreY = body.top + body.height / 2 - rootBox.top;
    const scale = DRAG_WOBBLE.FlyScale;
    // translate(t) scale(s) around the origin o maps a point p to o + s(p − o) + t.
    const x = target.left + target.width / 2 - slot.left - originX - scale * (centreX - originX);
    const y = target.top + target.height / 2 - slot.top - originY - scale * (centreY - originY);
    const style = this.element.style;
    style.transition =
      'transform var(--duration-slow) var(--ease-in-out), opacity var(--duration-slow) var(--ease-in)';
    style.transform = `translate(${round(x)}px, ${round(y)}px) scale(${scale})`;
    style.opacity = '0';
    return true;
  }
}

/** The box around all `elements` as they are drawn (transforms included); null for none. */
function unionRect(elements: readonly Element[]): DOMRect | null {
  const boxes = elements
    .map((element) => element.getBoundingClientRect())
    .filter((box) => box.width > 0 || box.height > 0);
  if (boxes.length === 0) {
    return null;
  }
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.right));
  const bottom = Math.max(...boxes.map((box) => box.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

/** `transform-origin` as computed ("12px 30px 0px", or percentages) in px; 0 0 when unreadable. */
function parseOrigin(value: string | undefined, element: HTMLElement): [number, number] {
  const [x = '', y = ''] = (value ?? '').split(' ');
  return [toPx(x, element.offsetWidth), toPx(y, element.offsetHeight)];
}

function toPx(part: string, size: number): number {
  const number = Number.parseFloat(part);
  if (!Number.isFinite(number)) {
    return 0;
  }
  return part.endsWith('%') ? (number / 100) * size : number;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
