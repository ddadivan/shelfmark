import { computed, inject, Service, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { FOLDER_LIMIT, type FolderResponse } from '@shelfmark/contracts';
import type { SelectOption } from '@shelfmark/ui';
import { FoldersStore } from '../../../stores/folders.store';
import { NEW_FOLDER_OPTION_ID } from '../models/new-folder-option-id.const';
import type { NewFolderOutcome } from '../models/new-folder-outcome.interface';
import { buildFolderOptions } from '../utils/folder-options';

/**
 * "Create folder" from the folder field of the add-link dialog (#454; provided by the dialog,
 * one per dialog), like the browser extension: a name typed in the field's search becomes a
 * pending folder, shown last with a "New" badge and chosen (`NEW_FOLDER_OPTION_ID`); a folder that
 * already has the name (ignoring case) is chosen instead. Nothing is created until Save:
 * `resolve` creates it then, and a failure leaves the link without a folder.
 */
@Service({ autoProvided: false })
export class AddLinkNewFolderService {
  private readonly folders = inject(FoldersStore);
  private readonly transloco = inject(TranslocoService);
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  /** Name of the folder to create on Save; `null` while there is none. */
  readonly name = signal<string | null>(null);

  /** The folder tree, plus the pending folder (last, with its badge). */
  readonly options = computed<SelectOption[]>(() => {
    const options = buildFolderOptions(this.folders.entities());
    const name = this.name();
    if (name === null) {
      return options;
    }
    this.i18n();
    const badge = this.transloco.translate('links.add.folder.newBadge');
    return [...options, { id: NEW_FOLDER_OPTION_ID, name, badge }];
  });

  /**
   * The "Create" row was chosen with `text`: returns the folder id the field takes, an existing
   * folder of that name or the pending one; `null` for a blank name (the field keeps its value).
   */
  choose(text: string): string | null {
    const name = text.trim().slice(0, FOLDER_LIMIT.NameMax).trim();
    if (name === '') {
      return null;
    }
    const existing = this.named(name);
    if (existing) {
      this.name.set(null);
      return existing.id;
    }
    this.name.set(name);
    return NEW_FOLDER_OPTION_ID;
  }

  /**
   * On Save: the folder id to send. The pending folder is created first (top level), unless a
   * folder of that name turned up meanwhile; when creating fails the link goes without a folder.
   * Either way the pending name is gone, so a retry of the save never creates it twice.
   */
  async resolve(folderId: string | null): Promise<NewFolderOutcome> {
    const name = this.name();
    if (folderId !== NEW_FOLDER_OPTION_ID || name === null) {
      return { folderId: folderId === NEW_FOLDER_OPTION_ID ? null : folderId, failedName: null };
    }
    const folder = this.named(name) ?? (await this.folders.create(name, null));
    this.name.set(null);
    return folder
      ? { folderId: folder.id, failedName: null }
      : { folderId: null, failedName: name };
  }

  /** A folder already called `name`, ignoring case. */
  private named(name: string): FolderResponse | undefined {
    const wanted = name.toLocaleLowerCase();
    return this.folders.entities().find((folder) => folder.name.toLocaleLowerCase() === wanted);
  }
}
