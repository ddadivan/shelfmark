import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { ERROR_TOAST_DEDUPE_MS } from './models/error-toast-dedupe.const';

/** The global toast for API failures; the same text is not shown again within `ERROR_TOAST_DEDUPE_MS`. */
@Service()
export class ApiErrorToastService {
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly lastShown = new Map<string, number>();

  /** Shows the error toast for a translation key (`<key>.title` and `<key>.detail`), unless the same one was shown a moment ago. */
  show(key: string): void {
    const now = Date.now();
    const last = this.lastShown.get(key);
    if (last !== undefined && now - last < ERROR_TOAST_DEDUPE_MS) {
      return;
    }
    this.lastShown.set(key, now);
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.transloco.translate(`${key}.title`),
      detail: this.transloco.translate(`${key}.detail`),
    });
  }
}
