import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Content closer than this to an edge counts as "at the edge" (sub-pixel scroll positions). */
const EDGE_THRESHOLD = 1;

const TOP_ATTRIBUTE = 'data-scroll-top';
const BOTTOM_ATTRIBUTE = 'data-scroll-bottom';

/**
 * Tells the `scroll-fade` mixin (`styles/_scroll-fade.scss`) which edges of a scroll area have
 * more content: sets `data-scroll-top` when the area is scrolled away from its start and
 * `data-scroll-bottom` when there is content below the visible part. The mixin draws each fade only
 * under its attribute, so an area that is not scrolled (or does not overflow) shows no fade, in
 * every browser (no scroll-driven animations needed).
 *
 * A passive `scroll` listener plus a `ResizeObserver` (the area and its children, so growing
 * content such as an expanded tree is noticed) feed one `requestAnimationFrame`-throttled update.
 *
 * `<div class="area" uiScrollFade>…</div>` (put it on the element that includes the mixin).
 */
@Directive({ selector: '[uiScrollFade]' })
export class ScrollFadeDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private frame: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor() {
    afterNextRender(() => this.start());
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  private start(): void {
    this.host.addEventListener('scroll', this.schedule, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.schedule);
      this.observeChildren();
    }
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver(() => {
        this.observeChildren();
        this.schedule();
      });
      this.mutationObserver.observe(this.host, { childList: true });
    }
    this.update();
  }

  private stop(): void {
    this.host.removeEventListener('scroll', this.schedule);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
    }
  }

  private observeChildren(): void {
    const observer = this.resizeObserver;
    if (!observer) {
      return;
    }
    observer.disconnect();
    observer.observe(this.host);
    for (const child of Array.from(this.host.children)) {
      observer.observe(child);
    }
  }

  private readonly schedule = (): void => {
    if (this.frame !== null) {
      return;
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.update();
    });
  };

  private update(): void {
    const { scrollTop, scrollHeight, clientHeight } = this.host;
    const below = scrollHeight - clientHeight - scrollTop;
    this.toggle(TOP_ATTRIBUTE, scrollTop > EDGE_THRESHOLD);
    this.toggle(BOTTOM_ATTRIBUTE, below > EDGE_THRESHOLD);
  }

  private toggle(attribute: string, on: boolean): void {
    if (on === this.host.hasAttribute(attribute)) {
      return;
    }
    if (on) {
      this.host.setAttribute(attribute, '');
    } else {
      this.host.removeAttribute(attribute);
    }
  }
}
