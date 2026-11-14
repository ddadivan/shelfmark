import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  LINK_LIMIT,
  TRASH_ITEM_KIND,
  type LinkResponse,
  type UpdateLinksBatchRequest,
} from '@shelfmark/contracts';
import {
  DIALOG_SIZE,
  DialogService,
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  toastShortcutLabel,
  type TagSuggestion,
} from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { pluralKey } from '../../../core/i18n/plural-key';
import { UndoToastService } from '../../../core/undo/undo-toast.service';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { TrashStore } from '../../../stores/trash.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { TRASH_OUTCOME } from '../../trash/models/trash-outcome.const';
import { safeHref } from '../utils/link-view';
import { LINKS_API } from '../models/links-api.const';
import type { MovePickerData } from '../models/move-picker-data.interface';
import { MovePickerComponent } from '../components/move-picker/move-picker.component';
import { BulkTagsDialogComponent } from '../components/bulk-tags-dialog/bulk-tags-dialog.component';
import { groupedByFolder, tagCounts, withTagsChanged } from '../utils/bulk-link-changes';
import { chunks } from '../utils/chunks';
import { BULK_OPEN_CONFIRM_ABOVE } from '../models/bulk-open-confirm-above.const';
import type { BulkTagsChange } from '../models/bulk-tags-change.interface';
import type { BulkTagsDialogData } from '../models/bulk-tags-dialog-data.interface';

/** The share part of `Navigator`, so a browser without it type-checks as missing. */
interface ShareCapable {
  share?: (data: { text?: string; title?: string }) => Promise<void>;
}

/**
 * The bulk actions on the selected links (#267): move, tags, favorite, open all, copy, share and
 * delete. Changes are optimistic (the feed shows them at once and rolls back with a toast when a
 * request fails); counts of folders, tags and saved views refresh afterwards. Delete moves the
 * links to Trash right away, and its Undo restores them through Trash. Every method resolves
 * `true` when the selection should be cleared (the links left the view or are gone).
 */
@Service()
export class BulkLinkActionsService {
  private readonly store = inject(LinksStore);
  private readonly folders = inject(FoldersStore);
  private readonly tags = inject(TagsStore);
  private readonly trash = inject(TrashStore);
  private readonly views = inject(SavedViewsStore);
  private readonly pins = inject(PinsStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly undoToast = inject(UndoToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);
  // Resolved on use, like `LinkActionsService`.
  private readonly injector = inject(Injector);

  /** Whether the browser can share (the phone bar hides Share without it). */
  canShare(): boolean {
    return typeof this.navigator()?.share === 'function';
  }

  /** "Move": the folder picker for the selection; choosing a folder moves all of them in one batch, with Undo. */
  async move(links: readonly LinkResponse[]): Promise<boolean> {
    if (links.length === 0) {
      return false;
    }
    const folders = new Set(links.map((link) => link.folderId));
    const pick: { folderId?: string | null } = {};
    await this.dialogs.open<MovePickerComponent, boolean, MovePickerData>(MovePickerComponent, {
      // 560px: the width of a tablet sheet; the picker focuses its own search box.
      size: DIALOG_SIZE.Md,
      autoFocus: false,
      data: {
        heading: this.plural('bulk.move.title', links.length),
        // One shared folder is the current one; a mixed selection has none.
        currentIds: folders.size === 1 ? [...folders] : [],
        submit: (folderId) => (pick.folderId = folderId),
      },
    }).result;
    if (pick.folderId === undefined) {
      return false;
    }
    return this.moveTo(links, pick.folderId);
  }

  /** Moves the links at once; the toast's Undo puts each back into the folder it came from. */
  async moveTo(links: readonly LinkResponse[], folderId: string | null): Promise<boolean> {
    const moving = links.filter((link) => link.folderId !== folderId);
    if (moving.length === 0) {
      return true;
    }
    const ok = await this.update(moving, { folderId }, (link) => ({
      ...link,
      folderId,
      pinnedInFolderAt: null,
    }));
    if (!ok) {
      this.failed(
        'bulk.move.failed',
        'bulk.move.failedDetail',
        () => void this.moveTo(links, folderId),
      );
      return false;
    }
    const undo = this.t('links.item.undo');
    this.toasts.show({
      kind: TOAST_KIND.Moved,
      title: this.plural('bulk.move.moved', moving.length, { folder: this.folderLabel(folderId) }),
      detail: this.titles(moving),
      duration: TOAST_DURATION_MS.Undo,
      actionHint: this.t('toast.actionHint', { shortcut: toastShortcutLabel(), action: undo }),
      action: { label: undo, run: () => void this.moveBack(moving, folderId) },
    });
    return true;
  }

  /** "Tags": add to and remove from every selected link in one request. */
  async editTags(links: readonly LinkResponse[]): Promise<boolean> {
    if (links.length === 0) {
      return false;
    }
    void this.tags.load();
    const present = tagCounts(links);
    const change = await this.dialogs.open<
      BulkTagsDialogComponent,
      BulkTagsChange,
      BulkTagsDialogData
    >(BulkTagsDialogComponent, {
      size: DIALOG_SIZE.Sm,
      data: {
        heading: this.plural('bulk.tags.title', links.length),
        suggestions: this.tags.entities().map<TagSuggestion>((tag) => ({
          name: tag.name,
          countLabel: this.plural('tags.count', tag.linkCount),
        })),
        present: [...present].map<TagSuggestion>(([name, count]) => ({
          name,
          countLabel: this.t('bulk.tags.onLinks', {
            count: String(count),
            total: String(links.length),
          }),
        })),
      },
    }).result;
    if (!change) {
      return false;
    }
    await this.applyTags(links, change);
    return false;
  }

  /** Applies a tags change; a link that would pass the tag limit fails the whole change. */
  async applyTags(links: readonly LinkResponse[], change: BulkTagsChange): Promise<boolean> {
    const request: Omit<UpdateLinksBatchRequest, 'ids'> = {
      ...(change.add.length > 0 ? { addTags: [...change.add] } : {}),
      ...(change.remove.length > 0 ? { removeTags: [...change.remove] } : {}),
    };
    let error: unknown;
    const ok = await this.update(
      links,
      request,
      (link) => withTagsChanged(link, change),
      (cause) => (error = cause),
    );
    if (!ok) {
      const tooMany =
        error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict;
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('bulk.tags.failed'),
        detail: tooMany
          ? this.t('bulk.tags.tooMany', { max: String(LINK_LIMIT.TagsMax) })
          : this.t('bulk.tags.failedDetail'),
      });
      return false;
    }
    void this.tags.noteLinkSaved();
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title: this.plural('bulk.tags.done', links.length),
    });
    return true;
  }

  /** "Favorite": on for all when any selected link is off, else off for all. */
  async toggleFavorite(links: readonly LinkResponse[]): Promise<boolean> {
    if (links.length === 0) {
      return false;
    }
    const isFavorite = links.some((link) => !link.isFavorite);
    const ok = await this.update(links, { isFavorite }, (link) => ({ ...link, isFavorite }));
    if (!ok) {
      this.failed(
        'bulk.favorite.failed',
        'bulk.favorite.failedDetail',
        () => void this.toggleFavorite(links),
      );
      return false;
    }
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title: this.plural(isFavorite ? 'bulk.favorite.on' : 'bulk.favorite.off', links.length),
    });
    return false;
  }

  /**
   * "Open all": one new tab per link (http and https only), after a confirm above
   * `BULK_OPEN_CONFIRM_ABOVE`. The browser may block some pop-ups; the toast then says how many.
   */
  async openAll(links: readonly LinkResponse[]): Promise<boolean> {
    const hrefs = links.map((link) => safeHref(link.url)).filter((href) => href !== undefined);
    if (hrefs.length === 0) {
      return false;
    }
    if (hrefs.length > BULK_OPEN_CONFIRM_ABOVE) {
      const confirmed = await this.dialogs.confirm({
        title: this.t('bulk.open.confirmTitle', { count: String(hrefs.length) }),
        message: this.t('bulk.open.confirmMessage'),
        confirmLabel: this.t('bulk.open.confirm'),
        cancelLabel: this.t('bulk.open.cancel'),
        closeLabel: this.t('bulk.open.close'),
      });
      if (!confirmed) {
        return false;
      }
    }
    const view = this.doc.defaultView;
    let opened = 0;
    for (const href of hrefs) {
      // Without the `noopener` feature, so a blocked pop-up is visible as `null`; the opener is
      // cut right away, before the new page can load.
      const tab = view?.open(href, '_blank');
      if (tab) {
        tab.opener = null;
        opened++;
      }
    }
    if (opened < hrefs.length) {
      this.toasts.show({
        kind: TOAST_KIND.Warn,
        title: this.t('bulk.open.blocked', {
          blocked: String(hrefs.length - opened),
          count: String(hrefs.length),
        }),
        detail: this.t('bulk.open.blockedDetail'),
      });
    }
    return false;
  }

  /** "Copy links": the URLs, one per line. */
  async copy(links: readonly LinkResponse[]): Promise<boolean> {
    try {
      await this.navigatorClipboard().writeText(this.urls(links));
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.plural('bulk.copy.done', links.length),
      });
    } catch {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('bulk.copy.failed') });
    }
    return false;
  }

  /** "Share" (phone): the system share sheet with the URLs as text. Cancelling is not an error. */
  async share(links: readonly LinkResponse[]): Promise<boolean> {
    const share = this.navigator()?.share;
    if (typeof share !== 'function') {
      return false;
    }
    try {
      await share.call(this.navigator(), { text: this.urls(links) });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('bulk.share.failed') });
      }
    }
    return false;
  }

  /**
   * "Delete": confirm, then the links leave the feed and go to Trash at once (one request per 100).
   * The Undo toast restores them through Trash; a failure brings them back with a toast.
   */
  async delete(links: readonly LinkResponse[]): Promise<boolean> {
    if (links.length === 0) {
      return false;
    }
    const confirmed = await this.dialogs.confirm({
      title: this.plural('bulk.delete.title', links.length),
      message: this.t('bulk.delete.message', { days: String(this.settings.retentionDays()) }),
      confirmLabel: this.t('bulk.delete.confirm'),
      cancelLabel: this.t('bulk.delete.cancel'),
      closeLabel: this.t('bulk.delete.close'),
      destructive: true,
    });
    if (!confirmed) {
      return false;
    }
    const ids = links.map((link) => link.id);
    const snapshot = this.store.snapshot();
    this.store.removeLinks(ids);
    try {
      for (const batch of chunks(ids, LINK_LIMIT.BatchMax)) {
        await firstValueFrom(this.api().removeBatch(batch));
      }
    } catch {
      this.store.restoreSnapshot(snapshot, links);
      this.refreshCounts();
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('bulk.delete.failed'),
        detail: this.t('bulk.delete.failedDetail'),
      });
      return false;
    }
    for (const id of ids) {
      this.pins.dropLink(id);
    }
    this.refreshCounts();
    void this.trash.refresh();
    this.undoToast.show({
      title: this.plural('bulk.delete.done', links.length),
      detail: this.titles(links),
      actionLabel: this.t('links.item.undo'),
      onUndo: () => void this.restore(ids),
      onExpire: () => undefined,
    });
    return true;
  }

  /** Undo of a bulk delete: Trash restore (it refreshes the feed, folders and tags). */
  private async restore(ids: readonly string[]): Promise<void> {
    const outcome = await this.trash.restore(ids.map((id) => ({ kind: TRASH_ITEM_KIND.Link, id })));
    if (outcome === TRASH_OUTCOME.Done) {
      void this.views.refresh();
      void this.pins.refresh();
      return;
    }
    this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('bulk.delete.undoFailed') });
  }

  /** Undo of a bulk move: every link goes back to its own folder (one request per folder). */
  private async moveBack(moved: readonly LinkResponse[], to: string | null): Promise<void> {
    const groups = groupedByFolder(moved, to);
    for (const [folderId, group] of groups) {
      const ok = await this.update(group, { folderId }, (link) => ({ ...link, folderId }));
      if (!ok) {
        this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('bulk.move.undoFailed') });
        return;
      }
    }
    // Links that had left the open view come back with the next page load.
    this.store.refresh();
  }

  /**
   * One optimistic batch update: the feed shows `apply` at once, then the server's links replace
   * them; a failure restores the feed. Counts refresh either way.
   */
  private async update(
    links: readonly LinkResponse[],
    change: Omit<UpdateLinksBatchRequest, 'ids'>,
    apply: (link: LinkResponse) => LinkResponse,
    onError?: (error: unknown) => void,
  ): Promise<boolean> {
    const snapshot = this.store.snapshot();
    this.store.patchLinks(links.map(apply));
    try {
      for (const batch of chunks(links, LINK_LIMIT.BatchMax)) {
        const response = await firstValueFrom(
          this.api().updateBatch({ ...change, ids: batch.map((link) => link.id) }),
        );
        this.store.patchLinks(response.links);
      }
      this.refreshCounts();
      return true;
    } catch (error) {
      this.store.restoreSnapshot(snapshot, links);
      this.refreshCounts();
      onError?.(error);
      return false;
    }
  }

  /** Folder, tag and saved view counts after the library changed. */
  private refreshCounts(): void {
    void this.folders.refresh();
    void this.tags.noteLinkSaved();
    void this.views.refresh();
  }

  private failed(titleKey: string, detailKey: string, retry: () => void): void {
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.t(titleKey),
      detail: this.t(detailKey),
      action: { label: this.t('links.item.retry'), run: retry },
    });
  }

  /** "Work / Angular" for a folder, "Unsorted" for none. */
  private folderLabel(folderId: string | null): string {
    const path = folderId === null ? [] : this.folders.pathTo(folderId);
    return path.length > 0
      ? path.map((folder) => folder.name).join(' / ')
      : this.t('links.add.folder.unsorted');
  }

  /** The titles as the toast detail ("Wool coat, Ramen, Signal Forms"); the toast truncates. */
  private titles(links: readonly LinkResponse[]): string {
    return links.map((link) => link.title).join(', ');
  }

  private urls(links: readonly LinkResponse[]): string {
    return links.map((link) => link.url).join('\n');
  }

  private navigator(): (Navigator & ShareCapable) | undefined {
    return this.doc.defaultView?.navigator;
  }

  private navigatorClipboard(): Clipboard {
    const clipboard = this.navigator()?.clipboard;
    if (!clipboard) {
      throw new Error('No clipboard');
    }
    return clipboard;
  }

  private api() {
    return this.injector.get(LINKS_API);
  }

  private plural(base: string, count: number, params: Record<string, string> = {}): string {
    return this.t(pluralKey(base, count), { count: String(count), ...params });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
