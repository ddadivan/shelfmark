import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { ToastAreaService } from './toast-area.service';

/**
 * Marks the element the toasts centre on (#352): the content column of the shell, or a page's
 * own scroll area that a floating bar centres on. See `ToastAreaService`.
 */
@Directive({ selector: '[appToastArea]' })
export class ToastAreaDirective {
  constructor() {
    const unregister = inject(ToastAreaService).register(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
    );
    inject(DestroyRef).onDestroy(unregister);
  }
}
