import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { AddLinkDialogService } from './add-link/add-link-dialog.service';
import { ADD_LINK_ACTION } from './models/add-link-action.const';
import type { AddLinkData } from './models/add-link-data.interface';
import { UndoToastService } from './undo-toast.service';

/**
 * What a user can do with a link from the feed, the recent panel and the header: open, favorite,
 * delete (confirm, optimistic removal, Undo) and add. Texts come through Transloco here, so
 * the components only emit.
 */
@Service()
export class LinkActionsService {
  private readonly store = inject(LinksStore);
  private readonly folders = inject(FoldersStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly undoToast = inject(UndoToastService);
  private readonly addLinkDialog = inject(AddLinkDialogService);
  private readonly transloco = inject(TranslocoService);

  /** Records the open; the browser opens the link itself (the card is a real `<a>`). */
  open(link: LinkResponse): void {
    void this.store.recordOpen(link.id);
  }

  async toggleFavorite(link: LinkResponse): Promise<void> {
    if (await this.store.toggleFavorite(link.id)) {
      void this.folders.refresh();
      return;
    }
    this.toasts.show({
      kind: TOAST_KIND.Error,
      text: this.t('links.item.favoriteFailed'),
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
      text: this.t('links.item.deleted'),
      actionLabel: this.t('links.item.undo'),
      onUndo: () => this.store.undoRemove(link.id),
      onExpire: () => void this.commitDelete(link.id),
    });
  }

  /** Opens the add-link dialog; a saved link shows at once in the feed. */
  async addLink(data: AddLinkData = {}): Promise<void> {
    const result = await this.addLinkDialog.open(data);
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.store.addSaved(result.link);
      void this.folders.refresh();
      this.toasts.show({ kind: TOAST_KIND.Success, text: this.t('links.item.saved') });
    }
  }

  private async commitDelete(id: string): Promise<void> {
    if (await this.store.commitRemove(id)) {
      void this.folders.refresh();
    } else {
      this.toasts.show({ kind: TOAST_KIND.Error, text: this.t('links.item.deleteFailed') });
    }
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
