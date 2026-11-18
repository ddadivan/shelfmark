import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { CleanupApplyRequest, CleanupApplyResponse } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { TrashStore } from '../../../stores/trash.store';
import { CLEANUP_API } from '../models/cleanup-api.const';

/**
 * One clean-up run (AI-5): sends the selected rows in one request, takes the trashed copies out of
 * the feed, refreshes folder, tag, Trash, pin, reminder and saved-view counts like the bulk
 * actions, and confirms with one toast ("Cleaned up {n} things", copies in Trash and tags merged).
 * Root, so the toast outlives the page.
 */
@Service()
export class CleanupApplyService {
  private readonly injector = inject(Injector);
  private readonly links = inject(LinksStore);
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

  protected announce(response: CleanupApplyResponse, _undone?: () => void): void {
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title: this.plural('cleanup.toast.title', response.trashed + response.merged),
      detail: this.detail(response),
    });
  }

  /** The feed and the counts after the run. */
  private patch(response: CleanupApplyResponse): void {
    this.links.removeLinks(response.undo.trashedIds);
    if (response.merged > 0) {
      // Merged tags renamed many links: read the open view again.
      this.links.refresh();
    }
    this.refreshCounts();
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

  private refreshCounts(): void {
    void this.injector.get(FoldersStore).refresh();
    void this.injector.get(TagsStore).refresh();
    void this.injector.get(SavedViewsStore).refresh();
    void this.injector.get(TrashStore).refresh();
    void this.injector.get(PinsStore).refresh();
    void this.injector.get(RemindersStore).refresh();
  }

  private plural(base: string, count: number): string {
    return this.t(pluralKey(base, count), { count: String(count) });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
