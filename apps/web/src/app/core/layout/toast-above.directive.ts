import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { ToastAreaService } from './toast-area.service';

/**
 * Marks a floating bar the toasts sit above (#350, #352): the bulk bar. The value is an optional
 * selector of the visible part inside the host (the bulk bar's host carries a top padding);
 * without one the host itself is measured. See `ToastAreaService.registerBar`.
 */
@Directive({ selector: '[appToastAbove]' })
export class ToastAboveDirective {
  /** Selector of the visible bar inside the host; empty measures the host. */
  readonly appToastAbove = input('');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const service = inject(ToastAreaService);
    let unregister = (): void => undefined;
    afterNextRender(() => {
      const selector = this.appToastAbove();
      const bar = (selector ? host.querySelector<HTMLElement>(selector) : null) ?? host;
      unregister = service.registerBar(bar);
    });
    inject(DestroyRef).onDestroy(() => unregister());
  }
}
