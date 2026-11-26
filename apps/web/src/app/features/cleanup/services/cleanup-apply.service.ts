import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type {
  CleanupApplyRequest,
  CleanupApplyResponse,
  CleanupUndoRequest,
} from '@shelfmark/contracts';
import { TOAST_DURATION_MS, TOAST_KIND, ToastService, toastShortcutLabel } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { pluralKey } from '../../../core/i18n/plural-key';
import { LibraryRefreshService } from '../../../stores/library-refresh.service';
import { LinksStore } from '../../../stores/links.store';
import { CLEANUP_API } from '../models/cleanup-api.const';

/**
 * One clean-up run (AI-5): sends the selected rows in one request, takes the trashed copies out of
 * the feed, refreshes folder, tag, Trash, pin, reminder and saved-view counts and tells the other tabs
 * (`LibraryRefreshService`), and confirms with one toast ("Cleaned up {n} things", copies in Trash and tags merged)
 * whose Undo (8 s, Ctrl/⌘+Z) reverts the whole run by the server's run id (the server holds what to
 * revert, single-use). Root, so Undo still works after the page is left.
 */
@Service()
export class CleanupApplyService {
  private readonly injector = inject(Injector);
  private readonly links = inject(LinksStore);
  private readonly refresh = inject(LibraryRefreshService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /**
   * Applies `request`; resolves false (with a toast) when the request fails. `undone` runs after a
   * successful Undo, so the page can read its report again.
   */
  async apply(request: CleanupApplyRequest, undone?: () => void): Promise<boolean> {
    let response: CleanupApplyResponse;
    try {
      response = await firstValueFrom(this.injector.get(CLEANUP_API).apply(request));
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('cleanup.toast.failed'),
        detail: this.t('cleanup.toast.failedDetail'),
      });
      return false;
    }
    if (response.trashed + response.merged === 0) {
      // Every selected row changed meanwhile (trashed, edited, merged elsewhere): say so.
      this.toasts.show({
        kind: TOAST_KIND.Info,
        title: this.t('cleanup.toast.nothing'),
        detail: this.t('cleanup.toast.nothingDetail'),
      });
      return true;
    }
    this.patch(response);
    this.announce(response, undone);
    return true;
  }

  private announce(response: CleanupApplyResponse, undone?: () => void): void {
    const title = this.plural('cleanup.toast.title', response.trashed + response.merged);
    const request = response.undo;
    if (request === null) {
      this.toasts.show({ kind: TOAST_KIND.Success, title, detail: this.detail(response) });
      return;
    }
    const undo = this.t('cleanup.toast.undo');
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title,
      detail: this.detail(response),
      duration: TOAST_DURATION_MS.Undo,
      actionHint: this.t('toast.actionHint', { shortcut: toastShortcutLabel(), action: undo }),
      action: { label: undo, run: () => void this.undo(request, undone) },
    });
  }

  /**
   * Undo from the toast: the copies come back from Trash and the merged tags are split again, as
   * far as nothing changed them meanwhile (the server checks).
   */
  private async undo(request: CleanupUndoRequest, undone?: () => void): Promise<void> {
    try {
      await firstValueFrom(this.injector.get(CLEANUP_API).undo(request));
    } catch {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('cleanup.undoFailed') });
      return;
    }
    // Restored copies and split tags come back with the next page load.
    this.refresh.afterLibraryRewrite();
    undone?.();
    this.toasts.show({ kind: TOAST_KIND.Success, title: this.t('cleanup.undone') });
  }

  /** The feed and the counts after the run. */
  private patch(response: CleanupApplyResponse): void {
    this.links.removeLinks(response.trashedIds);
    // Merged tags renamed many links: read the open view again. Other tabs hear about it too.
    this.refresh.afterLibraryRewrite({ links: response.merged > 0 });
  }

  /** "2 copies in Trash, 1 tag merged" (either part alone when the other is 0). */
  private detail(response: { trashed: number; merged: number }): string {
    const copies = this.plural('cleanup.toast.copies', response.trashed);
    const tags = this.plural('cleanup.toast.tags', response.merged);
    if (response.trashed > 0 && response.merged > 0) {
      return this.t('cleanup.toast.detail', { copies, tags });
    }
    return response.trashed > 0 ? copies : tags;
  }

  private plural(base: string, count: number): string {
    return this.t(pluralKey(base, count), { count: String(count) });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
