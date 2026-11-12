import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { FOLDER_LIMIT, type FolderResponse } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { AuthStore } from '../../../core/auth/auth.store';
import { APP_PATH } from '../../../models/app-path.const';
import { DIALOG_FIRST_FIELD } from '../../../models/dialog-first-field.const';
import { sidebarActiveId } from '../../../shell/sidebar/sidebar-active-id';
import { SidebarTreeFocusService } from '../../../shell/sidebar/sidebar-tree-focus.service';
import { FoldersStore } from '../../../stores/folders.store';
import { TrashStore } from '../../../stores/trash.store';
import { LinkActionsService } from '../../links/link-actions.service';
import { FolderStyleDialogComponent } from '../components/folder-style-dialog/folder-style-dialog.component';
import type { FolderStyleDialogData } from '../models/folder-style-dialog-data.interface';
import { DeleteFolderDialogComponent } from '../components/delete-folder-dialog/delete-folder-dialog.component';
import { FolderNameDialogComponent } from '../components/folder-name-dialog/folder-name-dialog.component';
import type { DeleteFolderDialogData } from '../models/delete-folder-dialog-data.interface';
import type { FolderNameDialogData } from '../models/folder-name-dialog-data.interface';
import { FOLDER_NAME_MODE } from '../models/folder-name-mode.const';
import type { MoveFolderDialogData } from '../models/move-folder-dialog-data.interface';
import { MoveFolderDialogComponent } from '../components/move-folder-dialog/move-folder-dialog.component';
import type { ShareFolderDialogData } from '../../sharing/models/share-folder-dialog-data.interface';
import { ShareFolderDialogComponent } from '../../sharing/share-folder-dialog/share-folder-dialog.component';

/**
 * What a user can do with folders from the sidebar: create (also as a subfolder), rename, move,
 * share as a public collection, delete and add a link into one. Dialogs and texts live here, so components only call.
 * Create and delete wait for the server inside their dialog; rename and move close at once and
 * roll back with a toast when the request fails.
 */
@Service()
export class FolderActionsService {
  private readonly folders = inject(FoldersStore);
  private readonly trash = inject(TrashStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly linkActions = inject(LinkActionsService);
  private readonly treeFocus = inject(SidebarTreeFocusService);
  private readonly auth = inject(AuthStore);

  /** Creates a folder at the top level or inside `parent`, then opens it. */
  async create(parent: FolderResponse | null = null): Promise<void> {
    if (this.folders.atLimit()) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('folders.create.limit'),
        detail: this.t('folders.create.limitDetail', { max: String(FOLDER_LIMIT.PerUserMax) }),
      });
      return;
    }
    const outcome: { folder: FolderResponse | null } = { folder: null };
    await this.dialogs.open<FolderNameDialogComponent, boolean, FolderNameDialogData>(
      FolderNameDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        autoFocus: DIALOG_FIRST_FIELD,
        data: {
          mode: FOLDER_NAME_MODE.Create,
          parentId: parent?.id ?? null,
          name: '',
          submit: async (name, parentId) => {
            outcome.folder = await this.folders.create(name, parentId);
            return outcome.folder !== null;
          },
        },
      },
    ).result;
    if (outcome.folder) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('folders.create.done'),
        detail: outcome.folder.name,
      });
      await this.router.navigate([`/${APP_PATH.Folders}`, outcome.folder.id]);
    }
  }

  async rename(folder: FolderResponse): Promise<void> {
    await this.dialogs.open<FolderNameDialogComponent, boolean, FolderNameDialogData>(
      FolderNameDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        autoFocus: DIALOG_FIRST_FIELD,
        data: {
          mode: FOLDER_NAME_MODE.Rename,
          parentId: null,
          name: folder.name,
          submit: (name) => {
            if (name !== folder.name) {
              void this.folders.rename(folder.id, name).then((saved) => {
                if (!saved) {
                  this.toasts.show({
                    kind: TOAST_KIND.Danger,
                    title: this.t('folders.rename.failed'),
                    detail: this.t('folders.rename.failedDetail'),
                  });
                }
              });
            }
            return Promise.resolve(true);
          },
        },
      },
    ).result;
  }

  async move(folder: FolderResponse): Promise<void> {
    await this.dialogs.open<MoveFolderDialogComponent, boolean, MoveFolderDialogData>(
      MoveFolderDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        // The moved row may be gone (under a collapsed parent): focus the row or its new parent.
        restoreFocus: () => {
          this.treeFocus.restoreFocusNear(folder.id);
          return null;
        },
        data: {
          folder,
          submit: (parentId) => {
            void this.folders.move(folder.id, parentId).then((moved) => {
              if (!moved) {
                this.toasts.show({
                  kind: TOAST_KIND.Danger,
                  title: this.t('folders.move.failed'),
                  detail: this.t('folders.move.failedDetail'),
                });
              }
            });
          },
        },
      },
    ).result;
  }

  /**
   * Moves the folder to `toIndex` among its siblings (a drag or Alt+Up / Alt+Down in the sidebar);
   * the new place shows at once, a failure puts the old order back with a toast.
   */
  async reorder(folderId: string, toIndex: number): Promise<void> {
    if (!(await this.folders.reorder(folderId, toIndex))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('pins.moveFailed.title'),
        detail: this.t('pins.moveFailed.detail'),
      });
    }
  }

  /**
   * "Colour and icon": the dialog closes at once on Save and the folder wears the new style while
   * the request runs; a failure puts the old style back with a toast.
   */
  async style(folder: FolderResponse): Promise<void> {
    await this.dialogs.open<FolderStyleDialogComponent, boolean, FolderStyleDialogData>(
      FolderStyleDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        autoFocus: 'input:checked',
        data: {
          folder,
          linkCount: folder.linkCount,
          subfolderCount: this.folders.entities().filter((item) => item.parentId === folder.id)
            .length,
          submit: (style) => {
            if (style.colour === folder.colour && style.icon === folder.icon) {
              return;
            }
            void this.folders.setStyle(folder.id, style).then((saved) => {
              if (!saved) {
                this.toasts.show({
                  kind: TOAST_KIND.Danger,
                  title: this.t('folders.style.failed'),
                  detail: this.t('folders.style.failedDetail'),
                });
              }
            });
          },
        },
      },
    ).result;
  }

  /** Asks how to treat the links, deletes, and leaves the page when it showed a deleted folder. */
  async delete(folder: FolderResponse): Promise<void> {
    const outcome = { deleted: false };
    await this.dialogs.open<DeleteFolderDialogComponent, boolean, DeleteFolderDialogData>(
      DeleteFolderDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        data: {
          folder,
          linkCount: this.folders.subtreeLinkCount(folder.id),
          subfolderCount: this.folders.descendantIds(folder.id).length,
          submit: async (mode) => {
            outcome.deleted = await this.folders.remove(folder.id, mode, (doomed) =>
              this.leaveDeleted(doomed),
            );
            return outcome.deleted;
          },
        },
      },
    ).result;
    if (outcome.deleted) {
      void this.trash.refresh();
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('folders.delete.done'),
        detail: folder.name,
      });
    }
  }

  /** Opens the share dialog: the public link of the folder and its settings (#276). */
  async share(folder: FolderResponse): Promise<void> {
    await this.dialogs.open<ShareFolderDialogComponent, void, ShareFolderDialogData>(
      ShareFolderDialogComponent,
      {
        size: DIALOG_SIZE.Md,
        data: {
          folder,
          linkCount: this.folders.subtreeLinkCount(folder.id),
          isDemo: this.auth.user()?.isDemo ?? false,
        },
      },
    ).result;
  }

  /** Opens the add-link dialog with the folder preselected. */
  addLinkHere(folder: FolderResponse): Promise<void> {
    return this.linkActions.addLink({ folderId: folder.id });
  }

  /** Before the folders disappear: moves off the page of a deleted folder, so it never shows "not found". */
  private async leaveDeleted(doomed: readonly string[]): Promise<void> {
    const active = sidebarActiveId(this.router.url);
    if (active !== null && doomed.includes(active)) {
      await this.router.navigateByUrl(`/${APP_PATH.Links}`);
    }
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
