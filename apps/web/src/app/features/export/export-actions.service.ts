import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { ExportFormat } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { EXPORT_API } from './models/export-api.const';
import type { ExportScope } from './models/export-scope.interface';

/**
 * Exports links from the library toolbar, the account menu and settings. A failure shows an
 * error toast with a retry; the texts come through Transloco here, so components only call.
 */
@Service()
export class ExportActionsService {
  // Resolved on use: the shell injects this service where specs provide no `EXPORT_API`.
  private readonly injector = inject(Injector);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  private running = false;

  /**
   * Downloads `format` for `scope` (the whole library when omitted). Ignored while another
   * export runs, so a double click does not save the file twice.
   */
  async download(format: ExportFormat, scope: ExportScope = {}): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      await firstValueFrom(this.injector.get(EXPORT_API).download(format, scope), {
        defaultValue: undefined,
      });
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Error,
        text: this.transloco.translate('export.failed'),
        action: {
          label: this.transloco.translate('export.retry'),
          run: () => void this.download(format, scope),
        },
      });
    } finally {
      this.running = false;
    }
  }
}
