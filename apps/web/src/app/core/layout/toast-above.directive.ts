import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { ToastAreaService } from './toast-area.service';

/**
 * Marks a floating bar the toasts sit above (#350, #352): the bulk bar. The value is an optional
 * selector of the visible part inside the host (the bulk bar's host carries a top padding, so the
 * host itself is never measured then); while that part is not rendered yet, the directive waits
 * for it to appear. Without a selector the host itself is measured. See
 * `ToastAreaService.registerBar`.
 */
@Directive({ selector: '[appToastAbove]' })
export class ToastAboveDirective {
  /** Selector of the visible bar inside the host; empty measures the host. */
  readonly appToastAbove = input('');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const service = inject(ToastAreaService);
    let unregister = (): void => undefined;
    let observer: MutationObserver | undefined;
    const find = (selector: string): HTMLElement | null =>
      selector ? host.querySelector<HTMLElement>(selector) : host;
    afterNextRender(() => {
      const selector = this.appToastAbove();
      const bar = find(selector);
      if (bar) {
        unregister = service.registerBar(bar);
        return;
      }
      observer = new MutationObserver(() => {
        const appeared = find(selector);
        if (appeared) {
          observer?.disconnect();
          observer = undefined;
          unregister = service.registerBar(appeared);
        }
      });
      observer.observe(host, { childList: true, subtree: true });
    });
    inject(DestroyRef).onDestroy(() => {
      observer?.disconnect();
      unregister();
    });
  }
}
