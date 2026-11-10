import { DOCUMENT } from '@angular/common';
import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import {
  DIALOG_SIZE,
  DialogService,
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  toastShortcutLabel,
} from '@shelfmark/ui';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { TagsStore } from '../../stores/tags.store';
import { AddLinkDialogService } from './add-link/add-link-dialog.service';
import { ADD_LINK_ACTION } from './models/add-link-action.const';
import type { AddLinkData } from './models/add-link-data.interface';
import { ownImageUrl, safeHref } from './link-view';
import { LINKS_API } from './models/links-api.const';
import { UndoToastService } from '../../core/undo/undo-toast.service';
import type { MoveLinkDialogData } from './models/move-link-dialog-data.interface';
import { MoveLinkDialogComponent } from './move-link-dialog/move-link-dialog.component';

/**
 * What a user can do with a link from the feed, the recent panel and the header: open, favorite,
 * edit, move to a folder (optimistic, Undo), delete (confirm, optimistic removal, Undo) and add. Texts come through Transloco here, so
 * the components only emit.
 */
@Service()
export class LinkActionsService {
  private readonly store = inject(LinksStore);
  private readonly folders = inject(FoldersStore);
  private readonly tags = inject(TagsStore);
  // Resolved on use: the shell injects this service where specs provide no `LINKS_API`.
  private readonly injector = inject(Injector);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly undoToast = inject(UndoToastService);
  private readonly addLinkDialog = inject(AddLinkDialogService);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);

  /** Records the open; the browser opens the link itself (the card is a real `<a>`). */
  open(link: LinkResponse): void {
    void this.store.recordOpen(link.id);
  }

  /** "Open" from a menu: a new tab (http and https only), and the open is recorded. */
  openInNewTab(link: LinkResponse): void {
    const href = safeHref(link.url);
    if (href) {
      this.doc.defaultView?.open(href, '_blank', 'noopener,noreferrer');
      this.open(link);
    }
  }

  async toggleFavorite(link: LinkResponse): Promise<void> {
    if (await this.store.toggleFavorite(link.id)) {
      void this.folders.refresh();
      return;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.t('links.item.favoriteFailed'),
      detail: link.title,
      action: { label: this.t('links.item.retry'), run: () => void this.toggleFavorite(link) },
    });
  }

  async delete(link: LinkResponse): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.t('links.item.confirm.title'),
      message: this.t('links.item.confirm.message', { title: link.title }),
      confirmLabel: this.t('links.item.confirm.confirm'),
      cancelLabel: this.t('links.item.confirm.cancel'),
      closeLabel: this.t('links.item.confirm.close'),
      destructive: true,
    });
    if (!confirmed || !this.store.remove(link.id)) {
      return;
    }
    this.undoToast.show({
      title: this.t('links.item.deleted'),
      detail: link.title,
      actionLabel: this.t('links.item.undo'),
      onUndo: () => this.store.undoRemove(link.id),
      onExpire: () => void this.commitDelete(link.id),
    });
  }

  /** "Move to folder…": picks a folder in a dialog (a sheet on phones), then moves the link. */
  async move(link: LinkResponse): Promise<void> {
    await this.dialogs.open<MoveLinkDialogComponent, boolean, MoveLinkDialogData>(
      MoveLinkDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        data: { link, submit: (folderId) => void this.moveTo(link, folderId) },
      },
    ).result;
  }

  /**
   * Moves a link at once and confirms with a `moved` toast that offers Undo; a failed request
   * rolls the move back and says so. Also used by drag and drop.
   */
  async moveTo(link: LinkResponse, folderId: string | null): Promise<void> {
    const from = link.folderId;
    if (from === folderId) {
      return;
    }
    if (!(await this.store.move(link, folderId))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('links.move.failed'),
        detail: this.t('links.move.failedDetail'),
        action: { label: this.t('links.item.retry'), run: () => void this.moveTo(link, folderId) },
      });
      return;
    }
    void this.folders.refresh();
    const undo = this.t('links.item.undo');
    this.toasts.show({
      kind: TOAST_KIND.Moved,
      title: this.t('links.move.moved', { folder: this.folderLabel(folderId) }),
      detail: link.title,
      folder: {},
      duration: TOAST_DURATION_MS.Undo,
      actionHint: this.t('toast.actionHint', { shortcut: toastShortcutLabel(), action: undo }),
      action: { label: undo, run: () => void this.moveBack({ ...link, folderId }, from) },
    });
  }

  private async moveBack(link: LinkResponse, folderId: string | null): Promise<void> {
    if (await this.store.move(link, folderId)) {
      void this.folders.refresh();
      return;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.t('links.move.undoFailed'),
      detail: link.title,
    });
  }

  /** Opens the add-link dialog; a saved link shows at once in the feed. */
  async addLink(data: AddLinkData = {}): Promise<void> {
    const result = await this.addLinkDialog.open(data);
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.noteSaved(result.link);
    } else if (result?.action === ADD_LINK_ACTION.OpenExisting) {
      // "Open saved": the already saved link opens in its edit dialog.
      await this.openSaved(result.existing.id);
    }
  }

  /** A link was saved (dialog or share page): it shows in the feed, the counts refresh, a toast confirms. */
  noteSaved(link: LinkResponse): void {
    this.store.addSaved(link);
    void this.folders.refresh();
    void this.tags.noteLinkSaved();
    this.toasts.show({
      kind: TOAST_KIND.Saved,
      title: this.t('links.item.savedTo', { folder: this.folderLabel(link.folderId) }),
      detail: link.title,
      thumb: ownImageUrl(link.imageUrl),
    });
  }

  /** Opens the add-link dialog in edit mode; a change replaces the link in the feed. */
  async edit(link: LinkResponse): Promise<void> {
    const result = await this.addLinkDialog.open({ link });
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.store.applyEdit(result.link);
      void this.tags.noteLinkSaved();
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('links.item.edited'),
        detail: result.link.title,
      });
    } else if (result?.action === ADD_LINK_ACTION.Delete) {
      await this.delete(result.link);
    }
  }

  /** "Work / Angular" for a link in a folder, "Unsorted" for one outside any folder. */
  private folderLabel(folderId: string | null): string {
    const path = folderId === null ? [] : this.folders.pathTo(folderId);
    return path.length > 0
      ? path.map((folder) => folder.name).join(' / ')
      : this.t('links.add.folder.unsorted');
  }

  private async openSaved(id: string): Promise<void> {
    try {
      const link =
        this.store.entityMap()[id] ?? (await firstValueFrom(this.injector.get(LINKS_API).get(id)));
      await this.edit(link);
    } catch {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('links.item.openFailed') });
    }
  }

  private async commitDelete(id: string): Promise<void> {
    if (await this.store.commitRemove(id)) {
      void this.folders.refresh();
      void this.tags.noteLinkSaved();
    } else {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('links.item.deleteFailed'),
        detail: this.t('links.item.deleteFailedDetail'),
      });
    }
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
