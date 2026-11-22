import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { ReducedMotion } from '../../services/motion/reduced-motion.service';
import {
  FLUID_HOVER_CLASS,
  FLUID_HOVER_POINTER,
  FLUID_HOVER_QUERY,
} from './models/fluid-hover.const';

/**
 * One highlight glides between the rows of a list under the mouse (docs/design/components/Motion,
 * "Fluid hover"), instead of each row blinking its own hover background. Put it on the list
 * container and name the row selector: `<div [uiFluidHover]="'.my-row'">`.
 *
 * The directive creates the highlight (`aria-hidden`, `pointer-events: none`, `z-index: -1` in the
 * container's own stacking context, so it sits under row content and the ripple) and moves it with
 * `transform` plus its size. The container gets `ui-fluid-hover--on`, which sets
 * `--ui-row-hover: transparent`: rows read that property for their hover background, so there is
 * no double highlight. The highlight lives in the container's scroll content, so it scrolls with
 * the rows; layout changes (resize, a group that opens) re-measure the current row. Keyboard
 * active and focus styles stay the rows' own.
 *
 * Mouse only: nothing is attached without `(hover: hover)`, and touch or pen pointers are ignored.
 * The first entry fades in place (no travel from a stale position); leaving fades out. Under
 * reduced motion (`ReducedMotion`) the highlight is placed at once and only fades.
 */
@Directive({
  selector: '[uiFluidHover]',
  exportAs: 'uiFluidHover',
})
export class FluidHoverDirective {
  /** Selector of the rows the highlight may rest on. */
  readonly rowSelector = input.required<string>({ alias: 'uiFluidHover' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly motion = inject(ReducedMotion);

  private highlight: HTMLElement | null = null;
  private current: HTMLElement | null = null;
  private shown = false;

  constructor() {
    const view = this.view;
    if (!(view?.matchMedia?.(FLUID_HOVER_QUERY).matches ?? false)) {
      return;
    }
    this.renderer.addClass(this.host, FLUID_HOVER_CLASS.Container);
    this.renderer.addClass(this.host, FLUID_HOVER_CLASS.On);
    const highlight: HTMLElement = this.renderer.createElement('span');
    this.renderer.addClass(highlight, FLUID_HOVER_CLASS.Highlight);
    this.renderer.addClass(highlight, FLUID_HOVER_CLASS.Jump);
    this.renderer.setAttribute(highlight, 'aria-hidden', 'true');
    this.renderer.appendChild(this.host, highlight);
    this.highlight = highlight;

    const unlisten = [
      this.renderer.listen(this.host, 'pointerover', (event: PointerEvent) => {
        this.onOver(event);
      }),
      this.renderer.listen(this.host, 'pointerleave', () => {
        this.hide();
      }),
      // A group that opens or closes moves the rows under a resting pointer.
      this.renderer.listen(this.host, 'transitionend', () => {
        this.remeasure();
      }),
      this.renderer.listen(view, 'resize', () => {
        this.remeasure();
      }),
    ];
    inject(DestroyRef).onDestroy(() => {
      unlisten.forEach((fn) => {
        fn();
      });
      highlight.remove();
      this.renderer.removeClass(this.host, FLUID_HOVER_CLASS.On);
    });
  }

  private onOver(event: PointerEvent): void {
    // A drag in progress (buttons held) or a non-mouse pointer never shows the highlight.
    if (event.pointerType !== FLUID_HOVER_POINTER || event.buttons !== 0) {
      this.hide();
      return;
    }
    const target = event.target;
    const row = target instanceof Element ? target.closest<HTMLElement>(this.rowSelector()) : null;
    if (!row || !this.host.contains(row) || row.getAttribute('aria-disabled') === 'true') {
      this.hide();
      return;
    }
    if (row !== this.current || !this.shown) {
      this.moveTo(row);
    }
  }

  private moveTo(row: HTMLElement): void {
    const highlight = this.highlight;
    if (!highlight) {
      return;
    }
    // First entry and reduced motion: placed at once, only the opacity changes.
    const jump = !this.shown || this.motion.reduced();
    this.renderer[jump ? 'addClass' : 'removeClass'](highlight, FLUID_HOVER_CLASS.Jump);
    this.place(highlight, row);
    this.current = row;
    if (!this.shown) {
      this.shown = true;
      // Commit the placement before the fade starts, so it does not travel.
      void highlight.offsetWidth;
      this.renderer.addClass(highlight, FLUID_HOVER_CLASS.Shown);
    }
  }

  /** Position and size in the host's scroll content (the highlight scrolls with the rows). */
  private place(highlight: HTMLElement, row: HTMLElement): void {
    const host = this.host.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    const x = rect.left - host.left + this.host.scrollLeft - this.host.clientLeft;
    const y = rect.top - host.top + this.host.scrollTop - this.host.clientTop;
    const style = highlight.style;
    style.setProperty('transform', `translate(${x}px, ${y}px)`);
    style.setProperty('width', `${rect.width}px`);
    style.setProperty('height', `${rect.height}px`);
    style.setProperty('border-radius', this.view?.getComputedStyle(row).borderRadius ?? '');
  }

  private remeasure(): void {
    const { highlight, current } = this;
    if (!highlight || !current || !this.shown) {
      return;
    }
    if (!current.isConnected) {
      this.hide();
      return;
    }
    this.place(highlight, current);
  }

  private hide(): void {
    this.current = null;
    if (this.shown && this.highlight) {
      this.shown = false;
      this.renderer.removeClass(this.highlight, FLUID_HOVER_CLASS.Shown);
    }
  }
}
