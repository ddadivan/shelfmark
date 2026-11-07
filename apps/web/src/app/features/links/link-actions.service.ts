import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { LinksStore } from '../../stores/links.store';
import { AddLinkDialogService } from './add-link/add-link-dialog.service';
import { ADD_LINK_ACTION } from './models/add-link-action.const';
import { LINKS_API } from './models/links-api.const';
import { UndoToastService } from './undo-toast.service';

/**
 * What a user can do with a link from the feed, the recent panel and the header: open, favorite,
 * edit, delete (confirm, optimistic removal, Undo) and add. Texts come through Transloco here, so
 * the components only emit.
 */
@Service()
export class LinkActionsService {
  private readonly store = inject(LinksStore);
  // Resolved on use: the shell injects this service where specs provide no `LINKS_API`.
  private readonly injector = inject(Injector);
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
  async addLink(): Promise<void> {
    const result = await this.addLinkDialog.open();
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.store.addSaved(result.link);
      this.toasts.show({ kind: TOAST_KIND.Success, text: this.t('links.item.saved') });
    } else if (result?.action === ADD_LINK_ACTION.OpenExisting) {
      // "Open saved": the already saved link opens in its edit dialog.
      await this.openSaved(result.existing.id);
    }
  }

  /** Opens the add-link dialog in edit mode; a change replaces the link in the feed. */
  async edit(link: LinkResponse): Promise<void> {
    const result = await this.addLinkDialog.open({ link });
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.store.applyEdit(result.link);
      this.toasts.show({ kind: TOAST_KIND.Success, text: this.t('links.item.edited') });
    } else if (result?.action === ADD_LINK_ACTION.Delete) {
      await this.delete(result.link);
    }
  }

  private async openSaved(id: string): Promise<void> {
    try {
      const link =
        this.store.entityMap()[id] ?? (await firstValueFrom(this.injector.get(LINKS_API).get(id)));
      await this.edit(link);
    } catch {
      this.toasts.show({ kind: TOAST_KIND.Error, text: this.t('links.item.openFailed') });
    }
  }

  private async commitDelete(id: string): Promise<void> {
    if (!(await this.store.commitRemove(id))) {
      this.toasts.show({ kind: TOAST_KIND.Error, text: this.t('links.item.deleteFailed') });
    }
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
