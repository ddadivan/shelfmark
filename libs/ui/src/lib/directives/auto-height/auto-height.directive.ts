import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Renderer2,
} from '@angular/core';
import { ReducedMotion } from '../../services/motion/reduced-motion.service';

/** Safety net when `transitionend` never fires (a hidden tab, a removed transition). */
const RELEASE_FALLBACK_MS = 400;

/**
 * Animates the height of a container when its content changes size: the link preview card of the
 * Add link dialog. The host must hold ONE inner wrapper element; a `ResizeObserver` watches that
 * wrapper, and when its height changes the host's height runs from the old value to the new one
 * (`--duration-base`, `--ease-in-out`), then is released to `auto`. The first measurement does not
 * animate. Reduced motion (`ReducedMotion`: the device setting and Settings › Animations): the
 * height just jumps.
 *
 * Animating `height` of one container is the deliberate exception of the Motion spec (like the
 * tree); the host is clipped (`overflow: clip`) only while it runs.
 *
 * `<div uiAutoHeight><div class="content">…</div></div>`
 */
@Directive({ selector: '[uiAutoHeight]' })
export class AutoHeightDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly motion = inject(ReducedMotion);
  private lastHeight: number | null = null;
  private running = false;
  private fallback: ReturnType<typeof setTimeout> | undefined;
  private observer: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => this.observe());
    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      clearTimeout(this.fallback);
    });
  }

  private observe(): void {
    const inner = this.host.firstElementChild;
    if (!(inner instanceof HTMLElement) || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.lastHeight = inner.offsetHeight;
    this.observer = new ResizeObserver(() => this.onResize(inner));
    this.observer.observe(inner);
  }

  private onResize(inner: HTMLElement): void {
    const next = inner.offsetHeight;
    const previous = this.lastHeight;
    this.lastHeight = next;
    if (previous === null || previous === next || this.motion.reduced()) {
      this.release();
      return;
    }
    // Mid-animation the host's own height is where the next run starts from.
    this.run(this.running ? this.host.offsetHeight : previous, next);
  }

  private run(from: number, to: number): void {
    this.running = true;
    this.setStyle('transition', 'none');
    this.setStyle('overflow', 'clip');
    this.setStyle('height', `${from}px`);
    // Reading a layout property commits the start height before the transition is switched on.
    void this.host.offsetHeight;
    this.setStyle('transition', 'height var(--duration-base) var(--ease-in-out)');
    this.setStyle('height', `${to}px`);
    this.host.removeEventListener('transitionend', this.onTransitionEnd);
    this.host.addEventListener('transitionend', this.onTransitionEnd);
    clearTimeout(this.fallback);
    this.fallback = setTimeout(() => this.release(), RELEASE_FALLBACK_MS);
  }

  private readonly onTransitionEnd = (event: Event): void => {
    // Transitions of the content bubble up; only the height of the host ends the run.
    if (event.target === this.host) {
      this.release();
    }
  };

  /** Back to the natural height: `auto`, no transition, no clip. */
  private release(): void {
    this.running = false;
    clearTimeout(this.fallback);
    this.host.removeEventListener('transitionend', this.onTransitionEnd);
    for (const name of ['height', 'transition', 'overflow']) {
      this.renderer.removeStyle(this.host, name);
    }
  }

  private setStyle(name: string, value: string): void {
    this.renderer.setStyle(this.host, name, value);
  }
}
