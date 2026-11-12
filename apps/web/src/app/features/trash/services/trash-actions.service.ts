import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TRASH_ITEM_KIND, type TrashItem } from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { TrashStore } from '../../../stores/trash.store';
import { TRASH_OUTCOME } from '../models/trash-outcome.const';
import { toRef } from '../utils/trash-key';

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
  private readonly transloco = inject(TranslocoService);

  async restore(items: readonly TrashItem[]): Promise<boolean> {
    if (items.length === 0) {
      return false;
    }
    const outcome = await this.store.restore(items.map(toRef));
    if (outcome === TRASH_OUTCOME.Done) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('trash.toast.restored'),
        detail: this.what(items, 'trash.toast.restoredMany'),
      });
      return true;
    }
    const full = outcome === TRASH_OUTCOME.Conflict;
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.t(full ? 'trash.toast.restoreFull' : 'trash.toast.restoreFailed'),
      detail: this.t(full ? 'trash.toast.restoreFullDetail' : 'trash.toast.restoreFailedDetail'),
    });
    return false;
  }

  async deleteForever(items: readonly TrashItem[]): Promise<boolean> {
    const [only] = items;
    if (!only) {
      return false;
    }
    const confirmed = await this.dialogs.confirm({
      title: this.t('trash.deleteConfirm.title'),
      message: this.deleteMessage(items),
      confirmLabel: this.t('trash.deleteConfirm.confirm'),
      cancelLabel: this.t('trash.deleteConfirm.cancel'),
      closeLabel: this.t('trash.deleteConfirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return false;
    }
    if ((await this.store.deleteForever(items.map(toRef))) === TRASH_OUTCOME.Done) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('trash.toast.deleted'),
        detail: this.what(items, 'trash.toast.deletedMany'),
      });
      return true;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.t('trash.toast.deleteFailed'),
      detail: this.t('trash.toast.deleteFailedDetail'),
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
      title: this.t('trash.emptyConfirm.title'),
      message: this.emptyMessage(total),
      confirmLabel: this.plural('trash.emptyConfirm.confirm', total),
      cancelLabel: this.t('trash.emptyConfirm.cancel'),
      closeLabel: this.t('trash.emptyConfirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return false;
    }
    if ((await this.store.empty()) === TRASH_OUTCOME.Done) {
      this.toasts.show({ kind: TOAST_KIND.Success, title: this.t('trash.toast.emptied') });
      return true;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.t('trash.toast.emptyFailed'),
      detail: this.t('trash.toast.emptyFailedDetail'),
    });
    return false;
  }

  /** The title of one entry, or "3 items are back" for several. */
  private what(items: readonly TrashItem[], manyKey: string): string {
    const [only] = items;
    return items.length === 1 && only ? only.title : this.plural(manyKey, items.length);
  }

  private deleteMessage(items: readonly TrashItem[]): string {
    const [only] = items;
    if (items.length === 1 && only) {
      return only.kind === TRASH_ITEM_KIND.Folder
        ? this.t('trash.deleteConfirm.messageFolder', {
            title: only.title,
            links: this.plural('trash.row.links', only.linkCount ?? 0),
          })
        : this.t('trash.deleteConfirm.message', { title: only.title });
    }
    return this.t('trash.deleteConfirm.messageMany', {
      items: this.plural('trash.emptyConfirm.items', items.length),
    });
  }

  private emptyMessage(total: number): string {
    const folders = this.store.folderItems();
    const items = this.plural('trash.emptyConfirm.items', total);
    const links = folders.reduce((sum, folder) => sum + (folder.linkCount ?? 0), 0);
    const [first] = folders;
    if (folders.length === 1 && first) {
      return this.t('trash.emptyConfirm.messageFolder', {
        items,
        name: first.title,
        links: this.plural('trash.row.links', links),
      });
    }
    if (folders.length > 1) {
      return this.t('trash.emptyConfirm.messageFolders', {
        items,
        folders: this.plural('trash.emptyConfirm.folders', folders.length),
        links: this.plural('trash.row.links', links),
      });
    }
    return this.t('trash.emptyConfirm.message', { items });
  }

  private plural(base: string, count: number): string {
    return this.transloco.translate(pluralKey(base, count), { count });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
