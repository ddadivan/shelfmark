import { DOCUMENT } from '@angular/common';
import { Service, effect, inject, signal } from '@angular/core';
import { ViewportService } from './viewport.service';

/** Distance from the window's left edge to the area, as a custom property on `html`. */
const INSET_START = '--ui-toast-inset-start';
/** Distance from the area to the window's right edge, as a custom property on `html`. */
const INSET_END = '--ui-toast-inset-end';

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
  }

  /** Makes `area` the one the toasts centre on; returns the function that takes it back. */
  register(area: HTMLElement): () => void {
    this.areas.update((areas) => [...areas, area]);
    return () => this.areas.update((areas) => areas.filter((a) => a !== area));
  }

  /** The client box of the area (without its scrollbar) is what a centred child centres on. */
  private apply(area: HTMLElement): void {
    const left = area.getBoundingClientRect().left + area.clientLeft;
    const right = this.root.clientWidth - (left + area.clientWidth);
    this.root.style.setProperty(INSET_START, `${Math.max(0, left)}px`);
    this.root.style.setProperty(INSET_END, `${Math.max(0, right)}px`);
  }
}
