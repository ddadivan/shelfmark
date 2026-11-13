import { DOCUMENT } from '@angular/common';
import { Service, effect, inject, signal } from '@angular/core';
import { ViewportService } from './viewport.service';

/** Distance from the window's left edge to the area, as a custom property on `html`. */
const INSET_START = '--ui-toast-inset-start';
/** Distance from the area to the window's right edge, as a custom property on `html`. */
const INSET_END = '--ui-toast-inset-end';
/** Distance from the window's bottom edge to the toasts, as a custom property on `html`. */
const OFFSET = '--ui-toast-offset';
/** Gap between a toast and the bar it sits above (#350). */
const GAP_ABOVE_BAR = 12;

/**
 * Centres the toasts on the content area (#352). On the desktop shell the content column sits
 * right of the sidebar and the bulk bar is centred on it, so the toasts must be too. Areas
 * register through `ToastAreaDirective`: the content column first, a page's own scroll area
 * (the library feed) on top of it; the last one wins, because it is what the bar centres on.
 * The distances to the window edges go to `html` (the toast region lives in the overlay, outside
 * the shell) and follow every resize, so a changed sidebar width or window size stays correct.
 * Without the sidebar (the mobile shell) nothing is set and the toasts stay centred on the window.
 */
@Service()
export class ToastAreaService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly desktop = inject(ViewportService).desktop;
  private readonly areas = signal<readonly HTMLElement[]>([]);
  private readonly bars = signal<readonly HTMLElement[]>([]);

  constructor() {
    effect((onCleanup) => {
      const area = this.areas().at(-1);
      if (!area || !this.desktop() || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.apply(area));
      observer.observe(area);
      observer.observe(this.root);
      this.apply(area);
      onCleanup(() => {
        observer.disconnect();
        this.root.style.removeProperty(INSET_START);
        this.root.style.removeProperty(INSET_END);
      });
    });
    effect((onCleanup) => {
      const bar = this.bars().at(-1);
      if (bar) {
        onCleanup(this.watchBar(bar));
      }
    });
  }

  /** Makes `area` the one the toasts centre on; returns the function that takes it back. */
  register(area: HTMLElement): () => void {
    this.areas.update((areas) => [...areas, area]);
    return () => this.areas.update((areas) => areas.filter((a) => a !== area));
  }

  /**
   * Keeps the toasts `GAP_ABOVE_BAR` above `bar` (the visible part of a floating bar, the bulk
   * bar) while it is registered: measured, so it holds for any bar height, shell and viewport;
   * the `--ui-toast-offset` rules in `styles.scss` stay as the first-frame fallback.
   */
  registerBar(bar: HTMLElement): () => void {
    this.bars.update((bars) => [...bars, bar]);
    return () => this.bars.update((bars) => bars.filter((b) => b !== bar));
  }

  /** Measures the bar on every change of its box, the window and the scroll, and on its entrance. */
  private watchBar(bar: HTMLElement): () => void {
    const view = this.root.ownerDocument.defaultView;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = bar.getBoundingClientRect().top;
      if (bar.isConnected && top > 0) {
        this.root.style.setProperty(
          OFFSET,
          `${Math.round(this.viewportHeight() - top + GAP_ABOVE_BAR)}px`,
        );
      }
    };
    const schedule = () => {
      if (!frame) {
        frame = view?.requestAnimationFrame(measure) ?? 0;
      }
    };
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    observer?.observe(bar);
    observer?.observe(this.root);
    const events = ['animationend', 'transitionend'] as const;
    const host = bar.parentElement ?? bar;
    events.forEach((type) => host.addEventListener(type, schedule));
    view?.addEventListener('resize', schedule);
    view?.addEventListener('scroll', schedule, { capture: true, passive: true });
    measure();
    return () => {
      if (frame) {
        view?.cancelAnimationFrame(frame);
      }
      observer?.disconnect();
      events.forEach((type) => host.removeEventListener(type, schedule));
      view?.removeEventListener('resize', schedule);
      view?.removeEventListener('scroll', schedule, { capture: true });
      this.root.style.removeProperty(OFFSET);
    };
  }

  /** The layout viewport height, the box `position: fixed; bottom` is measured from. */
  private viewportHeight(): number {
    return this.root.ownerDocument.defaultView?.innerHeight ?? this.root.clientHeight;
  }

  /** The client box of the area (without its scrollbar) is what a centred child centres on. */
  private apply(area: HTMLElement): void {
    const left = area.getBoundingClientRect().left + area.clientLeft;
    const right = this.root.clientWidth - (left + area.clientWidth);
    this.root.style.setProperty(INSET_START, `${Math.max(0, left)}px`);
    this.root.style.setProperty(INSET_END, `${Math.max(0, right)}px`);
  }
}
