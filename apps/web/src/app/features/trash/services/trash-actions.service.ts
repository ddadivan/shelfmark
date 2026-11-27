import { inject, Service } from '@angular/core';
import { TRASH_ITEM_KIND, type TrashItem } from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { TrashStore } from '../../../stores/trash.store';
import { TRASH_OUTCOME } from '../models/trash-outcome.const';
import { toRef } from '../utils/trash-key';
import { Translate } from '../../../core/i18n/translate.service';

/**
 * What a user can do in Trash: restore, delete forever (confirmed) and empty (confirmed). Texts
 * come through Transloco here, so the page and its rows only call. The store does the optimistic
 * work; a failure puts the entries back and a toast says so. Every method resolves `true` when
 * the entries are gone from Trash (the user confirmed and the request worked).
 */
@Service()
export class TrashActionsService {
  private readonly store = inject(TrashStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly translate = inject(Translate);

  async restore(items: readonly TrashItem[]): Promise<boolean> {
    if (items.length === 0) {
      return false;
    }
    const outcome = await this.store.restore(items.map(toRef));
    if (outcome === TRASH_OUTCOME.Done) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.translate.t('trash.toast.restored'),
        detail: this.what(items, 'trash.toast.restoredMany'),
      });
      return true;
    }
    const full = outcome === TRASH_OUTCOME.Conflict;
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.translate.t(full ? 'trash.toast.restoreFull' : 'trash.toast.restoreFailed'),
      detail: this.translate.t(
        full ? 'trash.toast.restoreFullDetail' : 'trash.toast.restoreFailedDetail',
      ),
    });
    return false;
  }

  async deleteForever(items: readonly TrashItem[]): Promise<boolean> {
    const [only] = items;
    if (!only) {
      return false;
    }
    const confirmed = await this.dialogs.confirm({
      title: this.translate.t('trash.deleteConfirm.title'),
      message: this.deleteMessage(items),
      confirmLabel: this.translate.t('trash.deleteConfirm.confirm'),
      cancelLabel: this.translate.t('trash.deleteConfirm.cancel'),
      closeLabel: this.translate.t('trash.deleteConfirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return false;
    }
    if ((await this.store.deleteForever(items.map(toRef))) === TRASH_OUTCOME.Done) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.translate.t('trash.toast.deleted'),
        detail: this.what(items, 'trash.toast.deletedMany'),
      });
      return true;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.translate.t('trash.toast.deleteFailed'),
      detail: this.translate.t('trash.toast.deleteFailedDetail'),
    });
    return false;
  }

  /** Asks first (with the number of items and of the links inside folders), then deletes everything. */
  async empty(): Promise<boolean> {
    const total = this.store.total();
    if (total === 0) {
      return false;
    }
    const confirmed = await this.dialogs.confirm({
      title: this.translate.t('trash.emptyConfirm.title'),
      message: this.emptyMessage(total),
      confirmLabel: this.translate.plural('trash.emptyConfirm.confirm', total),
      cancelLabel: this.translate.t('trash.emptyConfirm.cancel'),
      closeLabel: this.translate.t('trash.emptyConfirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return false;
    }
    if ((await this.store.empty()) === TRASH_OUTCOME.Done) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.translate.t('trash.toast.emptied'),
      });
      return true;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.translate.t('trash.toast.emptyFailed'),
      detail: this.translate.t('trash.toast.emptyFailedDetail'),
    });
    return false;
  }

  /** The title of one entry, or "3 items are back" for several. */
  private what(items: readonly TrashItem[], manyKey: string): string {
    const [only] = items;
    return items.length === 1 && only ? only.title : this.translate.plural(manyKey, items.length);
  }

  private deleteMessage(items: readonly TrashItem[]): string {
    const [only] = items;
    if (items.length === 1 && only) {
      return only.kind === TRASH_ITEM_KIND.Folder
        ? this.translate.t('trash.deleteConfirm.messageFolder', {
            title: only.title,
            links: this.translate.plural('trash.row.links', only.linkCount ?? 0),
          })
        : this.translate.t('trash.deleteConfirm.message', { title: only.title });
    }
    return this.translate.t('trash.deleteConfirm.messageMany', {
      items: this.translate.plural('trash.emptyConfirm.items', items.length),
    });
  }

  private emptyMessage(total: number): string {
    const folders = this.store.folderItems();
    const items = this.translate.plural('trash.emptyConfirm.items', total);
    const links = folders.reduce((sum, folder) => sum + (folder.linkCount ?? 0), 0);
    const [first] = folders;
    if (folders.length === 1 && first) {
      return this.translate.t('trash.emptyConfirm.messageFolder', {
        items,
        name: first.title,
        links: this.translate.plural('trash.row.links', links),
      });
    }
    if (folders.length > 1) {
      return this.translate.t('trash.emptyConfirm.messageFolders', {
        items,
        folders: this.translate.plural('trash.emptyConfirm.folders', folders.length),
        links: this.translate.plural('trash.row.links', links),
      });
    }
    return this.translate.t('trash.emptyConfirm.message', { items });
  }
}
