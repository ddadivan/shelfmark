import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { ExportFormat } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import type { Observable } from 'rxjs';
import { EXPORT_API } from '../models/export-api.const';
import type { ExportScope } from '../models/export-scope.interface';
import type { ExportOptions } from '../models/export-options.interface';
import { EXPORT_RESULT } from '../models/export-result.const';
import type { ExportResult } from '../models/export-result.type';
import { FoldersStore } from '../../../stores/folders.store';

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
   * export runs, so a double click does not save the file twice. With nothing to export (no link
   * at all, or `viewEmpty` for a view) it saves no empty file and says why in an info toast.
   */
  async download(
    format: ExportFormat,
    scope: ExportScope = {},
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    if (this.running) {
      return EXPORT_RESULT.Skipped;
    }
    this.running = true;
    try {
      const whole = Object.keys(scope).length === 0;
      const empty = whole ? this.libraryEmpty() : options.viewEmpty === true;
      if (typeof empty === 'boolean' ? empty : await empty) {
        this.toasts.show({
          kind: TOAST_KIND.Info,
          title: this.transloco.translate(whole ? 'export.empty.title' : 'export.emptyView.title'),
          detail: this.transloco.translate(
            whole ? 'export.empty.detail' : 'export.emptyView.detail',
          ),
        });
        return EXPORT_RESULT.Empty;
      }
      const saved = await this.run(
        this.injector.get(EXPORT_API).download(format, scope),
        options.signal,
      );
      return saved ? EXPORT_RESULT.Saved : EXPORT_RESULT.Skipped;
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('export.failed'),
        detail: this.transloco.translate('export.failedDetail'),
        action: {
          label: this.transloco.translate('export.retry'),
          run: () => void this.download(format, scope),
        },
      });
      return EXPORT_RESULT.Failed;
    } finally {
      this.running = false;
    }
  }

  /** `true` when the export completes, `false` when `signal` aborted it (unsubscribing cancels the request). */
  private run(download: Observable<void>, signal?: AbortSignal): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (signal?.aborted) {
        resolve(false);
        return;
      }
      const subscription = download.subscribe({
        error: reject,
        complete: () => {
          resolve(true);
        },
      });
      signal?.addEventListener(
        'abort',
        () => {
          subscription.unsubscribe();
          resolve(false);
        },
        { once: true },
      );
    });
  }

  /**
   * The account has no link: the counts of the sidebar rows (`FoldersStore`, loaded once and
   * shared with the sidebar; answered at once when they are there). When they cannot be loaded the
   * export goes ahead as before.
   */
  private libraryEmpty(): boolean | Promise<boolean> {
    const folders = this.injector.get(FoldersStore);
    if (folders.loaded()) {
      return folders.counts().all === 0;
    }
    return this.loadThenCheck(folders);
  }

  private async loadThenCheck(folders: InstanceType<typeof FoldersStore>): Promise<boolean> {
    try {
      await folders.load();
    } catch {
      return false;
    }
    return folders.loaded() && folders.counts().all === 0;
  }
}
