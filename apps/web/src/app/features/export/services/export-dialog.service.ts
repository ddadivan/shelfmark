import { Dialog } from '@angular/cdk/dialog';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { APP_PATH } from '../../../models/app-path.const';
import { FoldersStore } from '../../../stores/folders.store';
import { ExportDialogComponent } from '../components/export-dialog/export-dialog.component';
import type { ExportDialogData } from '../models/export-dialog-data.interface';
import type { ExportFolderChoice } from '../models/export-folder-choice.interface';
import type { ExportViewChoice } from '../models/export-view-choice.interface';

/**
 * Opens "Export links" from the data menu, the You tab and Settings; nothing happens while another
 * dialog is open. Opened on a folder page, the dialog offers that folder next to the whole library
 * (Shelf 09-data "What": `GET /api/export?folderId=` takes the folder and its subfolders).
 */
@Service()
export class ExportDialogService {
  private readonly dialogs = inject(DialogService);
  private readonly cdk = inject(Dialog);
  private readonly router = inject(Router);
  private readonly folders = inject(FoldersStore);

  /**
   * Opens the dialog (a bottom sheet on a phone). With `view` (the library's "Export this view…")
   * it offers that view next to the whole library; else the folder page it sits on.
   */
  open(view?: ExportViewChoice): void {
    if (this.cdk.openDialogs.length > 0) {
      return;
    }
    this.dialogs.open<ExportDialogComponent, undefined, ExportDialogData>(ExportDialogComponent, {
      size: DIALOG_SIZE.Sm,
      data: view ? { folder: null, view } : { folder: this.currentFolder(), view: null },
    });
  }

  /** The folder of the page on screen (`/folders/:id`), when it is a known folder. */
  private currentFolder(): ExportFolderChoice | null {
    const path = this.router.parseUrl(this.router.url).root.children['primary']?.segments ?? [];
    const [first, second] = path;
    if (first?.path !== APP_PATH.Folders || second === undefined) return null;
    const folders = this.folders.entities();
    const folder = folders.find((item) => item.id === second.path);
    if (!folder) return null;
    // The export takes the subfolders too, so the count does.
    const ids = new Set([folder.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const item of folders) {
        if (item.parentId !== null && ids.has(item.parentId) && !ids.has(item.id)) {
          ids.add(item.id);
          grew = true;
        }
      }
    }
    const count = folders
      .filter((item) => ids.has(item.id))
      .reduce((sum, item) => sum + item.linkCount, 0);
    return { id: folder.id, name: folder.name, count };
  }
}
