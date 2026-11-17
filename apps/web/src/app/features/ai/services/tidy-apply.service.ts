import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { TidyApplyItem, TidyApplyResponse, TidyUndoRequest } from '@shelfmark/contracts';
import {
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  toastShortcutLabel,
  type ToastFolder,
} from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { toastFolder } from '../../links/utils/toast-folder';
import { AI_API } from '../models/ai-api.const';
import { TidyCountStore } from './tidy-count.store';

/**
 * One Tidy run (AI-2): sends the selected suggestions in one request, puts the changed links into
 * the feed, refreshes folder, tag and saved-view counts like the bulk actions, and confirms with
 * one toast ("Tidied {n} links", what moved and what was tagged) whose Undo (8 s, Ctrl/⌘+Z)
 * reverts the whole run with the server's `undo` payload. Root, so Undo still works after the page
 * is left.
 */
@Service()
export class TidyApplyService {
  private readonly injector = inject(Injector);
  private readonly links = inject(LinksStore);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly count = inject(TidyCountStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /**
   * Applies `items`; resolves false (with a toast) when the request fails. `undone` runs after a
   * successful Undo, so the page can read its list again.
   */
  async apply(items: readonly TidyApplyItem[], undone?: () => void): Promise<boolean> {
    if (items.length === 0) {
      return false;
    }
    let response: TidyApplyResponse;
    try {
      response = await firstValueFrom(this.api().applyTidy({ items: [...items] }));
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('ai.tidy.toast.failed'),
        detail: this.t('ai.tidy.toast.failedDetail'),
      });
      return false;
    }
    this.links.patchLinks(response.links, response.folders > 0);
    this.refreshCounts();
    if (response.applied > 0) {
      this.announce(response, undone);
    }
    return true;
  }

  private announce(response: TidyApplyResponse, undone?: () => void): void {
    const undo = this.t('ai.tidy.toast.undo');
    this.toasts.show({
      kind: response.folders > 0 ? TOAST_KIND.Moved : TOAST_KIND.Success,
      title: this.plural('ai.tidy.toast.title', response.applied),
      detail: this.detail(response),
      ...(response.folders > 0 && { folder: this.tile(response.undo) }),
      duration: TOAST_DURATION_MS.Undo,
      actionHint: this.t('toast.actionHint', { shortcut: toastShortcutLabel(), action: undo }),
      action: { label: undo, run: () => void this.undo(response.undo, undone) },
    });
  }

  /** Undo from the toast: what the run changed and is still there goes back. */
  private async undo(request: TidyUndoRequest, undone?: () => void): Promise<void> {
    try {
      const { links } = await firstValueFrom(this.api().undoTidy(request));
      this.links.patchLinks(links, true);
      // Links that had left the open view come back with the next page load.
      this.links.refresh();
      this.refreshCounts();
      undone?.();
      this.toasts.show({ kind: TOAST_KIND.Success, title: this.t('ai.tidy.undone') });
    } catch {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('ai.tidy.undoFailed') });
    }
  }

  /** "Moved into 4 folders, 19 tags added" (either part alone when the other is 0). */
  private detail(response: TidyApplyResponse): string {
    const folders = this.plural('ai.tidy.toast.folders', response.folders);
    const tags = this.plural('ai.tidy.toast.tags', response.tagsAdded);
    if (response.folders > 0 && response.tagsAdded > 0) {
      return this.t('ai.tidy.toast.detail', { folders, tags });
    }
    return response.folders > 0 ? folders : tags;
  }

  /** The tile of the one folder every moved link went to; graphite for several. */
  private tile(undo: TidyUndoRequest): ToastFolder {
    const ids = new Set(
      undo.items.flatMap((item) => (item.folderId === null ? [] : [item.folderId])),
    );
    const [only] = ids;
    const folder =
      ids.size === 1 && only !== undefined ? this.folders.entityMap()[only] : undefined;
    return folder ? toastFolder(folder, (colour) => this.settings.shownColour(colour)) : {};
  }

  /** Folder, tag and saved-view counts and the Tidy count after the library changed. */
  private refreshCounts(): void {
    void this.folders.refresh();
    void this.injector.get(TagsStore).noteLinkSaved();
    void this.injector.get(SavedViewsStore).refresh();
    void this.count.load();
  }

  private api() {
    return this.injector.get(AI_API);
  }

  private plural(base: string, count: number, params: Record<string, string> = {}): string {
    return this.t(pluralKey(base, count), { count: String(count), ...params });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
