import { DestroyRef, inject, Injector, Service } from '@angular/core';
import type { ToastOptions } from '@shelfmark/ui';

let host: typeof import('./toast-host') | undefined;

/** Loads the toast code (once); a toast shown afterwards needs no wait. */
export function loadToastHost(): Promise<typeof import('./toast-host')> {
  return import('./toast-host').then((loaded) => (host = loaded));
}

/**
 * Shows a toast from code that runs on the first screen (the error interceptor, `AuthStore`). The
 * toast service, its region and the overlay are a lazy chunk (#339): the signed-in shell loads
 * them with the app (it injects `ToastService` early), a guest only when the first toast comes.
 */
@Service()
export class LazyToastService {
  private readonly injector = inject(Injector);
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  show(options: ToastOptions): void {
    if (this.destroyed) {
      return;
    }
    if (host) {
      host.showToast(this.injector, options);
      return;
    }
    void loadToastHost().then((loaded) => {
      // The app (or a test) may be gone by the time the chunk arrives.
      if (!this.destroyed) {
        loaded.showToast(this.injector, options);
      }
    });
  }
}
