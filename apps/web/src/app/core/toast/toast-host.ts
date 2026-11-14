import type { Injector } from '@angular/core';
import { ToastService, type ToastOptions } from '@shelfmark/ui';

/**
 * The only module of the eager code that holds `ToastService` (and with it the toast region, the
 * overlay and the CDK overlay code): `LazyToastService` imports it on the first toast (#339).
 */
export function showToast(injector: Injector, options: ToastOptions): void {
  injector.get(ToastService).show(options);
}
