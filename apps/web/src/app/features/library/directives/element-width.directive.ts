import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

/**
 * Emits the host's border-box width in CSS pixels whenever it changes (a `ResizeObserver`; nothing
 * where the browser has none). The link preview split (#555) uses it to let the list grow until
 * the panel reaches its smallest width.
 */
@Directive({ selector: '[appElementWidth]' })
export class ElementWidthDirective {
  readonly appElementWidth = output<number>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() =>
      this.appElementWidth.emit(host.getBoundingClientRect().width),
    );
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
