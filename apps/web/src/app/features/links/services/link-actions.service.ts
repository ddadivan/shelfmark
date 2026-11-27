import { DOCUMENT } from '@angular/common';
import { inject, Injector, Service } from '@angular/core';
import { PIN_KIND, type LinkResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import {
  DIALOG_SIZE,
  DialogService,
  TOAST_KIND,
  ToastService,
  type ToastFolder,
  type ToastRef,
} from '@shelfmark/ui';
import { FoldersStore } from '../../../stores/folders.store';
import { RecentFoldersStore } from '../../../stores/recent-folders.store';
import { toastFolder } from '../utils/toast-folder';
import { LibraryRefreshService } from '../../../stores/library-refresh.service';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { PinActionsService } from '../../pins/services/pin-actions.service';
import { AddLinkDialogService } from './add-link-dialog.service';
import { RuleActionsService } from '../../rules/services/rule-actions.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { ADD_LINK_ACTION } from '../models/add-link-action.const';
import type { AddLinkSavedMany } from '../models/add-link-saved-many.interface';
import type { AddLinkData } from '../models/add-link-data.interface';
import { ownImageUrl, safeHref } from '../utils/link-view';
import { LINKS_API } from '../models/links-api.const';
import { UndoToastService } from '../../../core/undo/undo-toast.service';
import type { MovePickerData } from '../models/move-picker-data.interface';
import { MovePickerComponent } from '../components/move-picker/move-picker.component';
import { ReminderActionsService } from '../../reminders/services/reminder-actions.service';
import { AiFollowUpService } from '../../ai/services/ai-follow-up.service';
import { RuleOfferService } from '../../rules/services/rule-offer.service';
import { Translate } from '../../../core/i18n/translate.service';

/**
 * What a user can do with a link from the feed, the recent panel and the header: open, favorite,
 * edit, move to a folder (optimistic, Undo), delete (confirm, optimistic removal, Undo; the link then
 * waits in Trash) and add. Texts come through Transloco here, so
 * the components only emit.
 */
@Service()
export class LinkActionsService {
  private readonly store = inject(LinksStore);
  private readonly folders = inject(FoldersStore);
  private readonly refresh = inject(LibraryRefreshService);
  private readonly recent = inject(RecentFoldersStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly pins = inject(PinsStore);
  private readonly pinActions = inject(PinActionsService);
  // Resolved on use: the shell injects this service where specs provide no `LINKS_API`.
  private readonly injector = inject(Injector);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly undoToast = inject(UndoToastService);
  private readonly addLinkDialog = inject(AddLinkDialogService);
  private readonly ruleActions = inject(RuleActionsService);
  private readonly translate = inject(Translate);
  private readonly doc = inject(DOCUMENT);

  /** Records the open; the browser opens the link itself (the card is a real `<a>`). */
  open(link: LinkResponse): void {
    void this.store.recordOpen(link.id);
  }

  /**
   * "Open" from a menu (http and https only), and the open is recorded: a new tab, or this tab
   * when Settings › Library › Open links in says so.
   */
  openFromMenu(link: LinkResponse): void {
    const href = safeHref(link.url);
    if (!href) {
      return;
    }
    this.open(link);
    if (this.settings.openInNewTab()) {
      this.doc.defaultView?.open(href, '_blank', 'noopener,noreferrer');
    } else {
      this.doc.defaultView?.location.assign(href);
    }
  }

  async toggleFavorite(link: LinkResponse): Promise<void> {
    if (await this.store.toggleFavorite(link.id, link)) {
      this.refresh.afterChange({ folders: true });
      if (this.store.leftByUnstar(link.id)) {
        // Unstarred in Favorites (or an "only favorites" view): the card left, Undo stars it back.
        const undo = this.translate.t('links.item.undo');
        this.undoToast.show({
          kind: TOAST_KIND.Info,
          title: this.translate.t('links.item.unstarred'),
          detail: link.title,
          actionLabel: undo,
          onUndo: () => void this.undoUnstar(link),
        });
      }
      return;
    }
    this.undoToast.retry({
      title: this.translate.t('links.item.favoriteFailed'),
      detail: link.title,
      onRetry: () => void this.toggleFavorite(link),
    });
  }

  /**
   * Undo of an unstar: stars the link again to an explicit value, so it neither flips the wrong
   * way when the link was starred elsewhere meanwhile nor does nothing after the feed changed.
   */
  private async undoUnstar(link: LinkResponse): Promise<void> {
    const gone: LinkResponse = { ...link, isFavorite: false };
    if (await this.store.setFavorite(link.id, true, gone, { rejoin: true })) {
      this.refresh.afterChange({ folders: true });
      return;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.translate.t('links.item.favoriteFailed'),
      detail: link.title,
    });
  }

  /** "Pin to top" / "Unpin from top" of the open folder; a failure puts the link back with a toast. */
  async togglePinInFolder(link: LinkResponse): Promise<void> {
    if (await this.store.setPinnedInFolder(link.id, link.pinnedInFolderAt === null)) {
      return;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.translate.t('pins.pinnedToTopFailed.title'),
      detail: link.title,
    });
  }

  /** "Pin to sidebar" / "Unpin from sidebar". */
  async togglePinToSidebar(link: LinkResponse): Promise<void> {
    await (this.pins.has(PIN_KIND.Link, link.id)
      ? this.pinActions.unpinLink(link)
      : this.pinActions.pinLink(link));
  }

  async delete(link: LinkResponse): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.translate.t('links.item.confirm.title'),
      message: this.translate.t('links.item.confirm.message', {
        title: link.title,
        days: String(this.settings.retentionDays()),
      }),
      confirmLabel: this.translate.t('links.item.confirm.confirm'),
      cancelLabel: this.translate.t('links.item.confirm.cancel'),
      closeLabel: this.translate.t('links.item.confirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    if (!this.store.remove(link.id, link)) {
      // Already on its way out (a second delete of the same link): nothing more to do.
      return;
    }
    const toast = this.undoToast.show({
      title: this.translate.t('links.item.deleted'),
      detail: link.title,
      actionLabel: this.translate.t('links.item.undo'),
      onUndo: () => this.store.undoRemove(link.id),
      onExpire: () => void this.commitDelete(link.id),
    });
    this.store.attachUndo(link.id, () => toast.dismiss());
  }

  /** "Remind me…" / "Change reminder" (#275): presets or a date and time. */
  async remind(link: LinkResponse): Promise<void> {
    await this.injector.get(ReminderActionsService).remind([link]);
  }

  /** "Create a rule for youtube.com…" (#398): the rule dialog with the link's domain. */
  async createRule(link: LinkResponse): Promise<void> {
    await this.ruleActions.create(link.url);
  }

  /** "Move to folder…": a folder picker (a sheet below 64em); choosing a folder moves the link at once. */
  async move(link: LinkResponse): Promise<void> {
    await this.dialogs.open<MovePickerComponent, boolean, MovePickerData>(MovePickerComponent, {
      // 560px: the width of a tablet sheet; the picker focuses its own search box.
      size: DIALOG_SIZE.Md,
      autoFocus: false,
      data: {
        heading: this.translate.t('links.move.title', { title: link.title }),
        currentIds: [link.folderId],
        submit: (folderId) => void this.moveTo(link, folderId),
      },
    }).result;
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
      this.undoToast.retry({
        title: this.translate.t('links.move.failed'),
        detail: this.translate.t('links.move.failedDetail'),
        onRetry: () => void this.moveTo(link, folderId),
      });
      return;
    }
    this.refresh.afterChange({ folders: true });
    this.recent.record(folderId);
    const undo = this.translate.t('links.item.undo');
    const toast = this.undoToast.show({
      kind: TOAST_KIND.Moved,
      title: this.translate.t('links.move.moved', { folder: this.folderLabel(folderId) }),
      detail: link.title,
      folder: this.toastFolder(folderId),
      actionLabel: undo,
      onUndo: () => void this.moveBack({ ...link, folderId }, from),
    });
    if (folderId !== null) {
      this.offerRule([link.id], toast);
    }
  }

  /** The user filed links into a folder: a rule may be offered (AI-2, only while AI is on). */
  private offerRule(ids: readonly string[], toast?: ToastRef): void {
    this.injector.get(RuleOfferService).afterFiling(ids, toast);
  }

  /** The folder tile of a `moved` toast: the folder's colour and icon, graphite for Unsorted. */
  private toastFolder(folderId: string | null): ToastFolder {
    const folder = folderId === null ? undefined : this.folders.entityMap()[folderId];
    return toastFolder(folder, (colour) => this.settings.shownColour(colour));
  }

  private async moveBack(link: LinkResponse, folderId: string | null): Promise<void> {
    if (await this.store.move(link, folderId)) {
      this.refresh.afterChange({ folders: true });
      return;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.translate.t('links.move.undoFailed'),
      detail: link.title,
    });
  }

  /** Opens the add-link dialog; a saved link shows at once in the feed. */
  async addLink(data: AddLinkData = {}): Promise<void> {
    const result = await this.addLinkDialog.open(data);
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.noteSaved(result.link, result.folderChosen === true);
    } else if (result?.action === ADD_LINK_ACTION.SavedMany) {
      this.noteSavedMany(result);
    } else if (result?.action === ADD_LINK_ACTION.OpenExisting) {
      // "Open saved": the already saved link opens in its edit dialog.
      await this.openSaved(result.existing.id);
    }
  }

  /**
   * A link was saved (dialog or share page): it shows in the feed, the counts refresh, a toast
   * confirms. `folderChosen`: the user (or a suggestion they took) picked its folder.
   */
  noteSaved(link: LinkResponse, folderChosen = false): void {
    this.store.addSaved(link);
    // The summary and what Automatic mode does arrive a few seconds later (#390 / #391).
    this.injector.get(AiFollowUpService).watch(link, true);
    this.refresh.afterChange({ folders: true, tags: true });
    this.toasts.show({
      kind: TOAST_KIND.Saved,
      title: this.translate.t('links.item.savedTo', { folder: this.folderLabel(link.folderId) }),
      detail: link.title,
      thumb: ownImageUrl(link.imageUrl),
    });
    if (folderChosen && link.folderId !== null) {
      this.offerRule([link.id]);
    }
  }

  /**
   * Links saved from the paste-many list: they land in the feed, the counts refresh, and one
   * summary toast says how many went where, with Undo (8 s). Items the server skipped are named in
   * its second line instead of the "still loading" hint.
   */
  noteSavedMany(result: AddLinkSavedMany): void {
    const { links, errors } = result;
    if (links.length === 0) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('links.many.noneSaved'),
        detail: this.translate.t(pluralKey('links.many.skippedByServer', errors.length), {
          count: String(errors.length),
        }),
      });
      return;
    }
    this.store.addSavedMany(links);
    // Their summaries arrive a few seconds later, through one refresh loop for the batch.
    this.injector.get(AiFollowUpService).watchMany(links);
    this.refresh.afterChange({ folders: true, tags: true });
    const undo = this.translate.t('links.item.undo');
    // Domain rules (#398) may file the links in different folders: then no folder is named.
    const landed = new Set(links.map((link) => link.folderId));
    const shared = landed.size === 1 ? (links[0]?.folderId ?? null) : undefined;
    this.undoToast.show({
      kind: errors.length > 0 ? TOAST_KIND.Warn : TOAST_KIND.Success,
      title:
        shared === undefined
          ? this.translate.t(pluralKey('links.many.savedMixed', links.length), {
              count: String(links.length),
            })
          : this.translate.t(pluralKey('links.many.saved', links.length), {
              count: String(links.length),
              folder: this.folderLabel(shared),
            }),
      detail:
        errors.length > 0
          ? this.translate.t(pluralKey('links.many.skippedByServer', errors.length), {
              count: String(errors.length),
            })
          : this.translate.t('links.many.stillLoading'),
      actionLabel: undo,
      onUndo: () => void this.undoSavedMany(links),
    });
  }

  /**
   * Undo of a paste-many save: the links leave the feed at once and are deleted in one request;
   * when that fails they come back and a toast says so.
   */
  private async undoSavedMany(links: readonly LinkResponse[]): Promise<void> {
    const ids = links.map((link) => link.id);
    this.store.dropSaved(ids);
    try {
      await firstValueFrom(this.injector.get(LINKS_API).removeBatch(ids));
      this.refresh.afterChange({ folders: true, tags: true });
    } catch {
      this.store.addSavedMany(links);
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('links.many.undoFailed'),
        detail: this.translate.t('links.many.undoFailedDetail'),
      });
    }
  }

  /** Opens the add-link dialog in edit mode; a change replaces the link in the feed. */
  async edit(link: LinkResponse): Promise<void> {
    const result = await this.addLinkDialog.open({ link });
    if (result?.action === ADD_LINK_ACTION.Saved) {
      this.store.applyEdit(result.link);
      if (result.link.folderId !== null && result.link.folderId !== link.folderId) {
        this.offerRule([result.link.id]);
      }
      // A new address queues a new AI job (#391).
      this.injector.get(AiFollowUpService).watch(result.link);
      this.refresh.afterChange({ tags: true });
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.translate.t('links.item.edited'),
        detail: result.link.title,
      });
    } else if (result?.action === ADD_LINK_ACTION.Delete) {
      await this.delete(result.link);
    } else if (result?.action === ADD_LINK_ACTION.Remind) {
      await this.remind(result.link);
    }
  }

  /** "Work / Angular" for a link in a folder, "Unsorted" for one outside any folder. */
  private folderLabel(folderId: string | null): string {
    return this.folders.pathLabel(folderId) || this.translate.t('links.add.folder.unsorted');
  }

  private async openSaved(id: string): Promise<void> {
    try {
      const link =
        this.store.entityMap()[id] ?? (await firstValueFrom(this.injector.get(LINKS_API).get(id)));
      await this.edit(link);
    } catch {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('links.item.openFailed'),
      });
    }
  }

  private async commitDelete(id: string): Promise<void> {
    if (await this.store.commitRemove(id)) {
      // Counts, Trash, and a deleted link's reminder leaves the badge and the Reminders list.
      this.refresh.afterDelete();
    } else {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.translate.t('links.item.deleteFailed'),
        detail: this.translate.t('links.item.deleteFailedDetail'),
      });
    }
  }
}
