import { computed, inject, Service } from '@angular/core';
import { PIN_KIND, type FolderResponse } from '@shelfmark/contracts';
import { FolderActionsService } from '../../folders/services/folder-actions.service';
import { PinActionsService } from '../../pins/services/pin-actions.service';
import { PinsStore } from '../../../stores/pins.store';
import { LibraryFilterService } from './library-filter.service';

/**
 * The folder menu of a folder page (Shelf `04-organise` "Folder menu"): the actions of the folder
 * the page shows, the same ones as the sidebar row's menu. Page-scoped: the page provides it.
 */
@Service({ autoProvided: false })
export class LibraryFolderService {
  private readonly filters = inject(LibraryFilterService);
  private readonly actions = inject(FolderActionsService);
  private readonly pinActions = inject(PinActionsService);
  private readonly pins = inject(PinsStore);

  /** The folder of the page, or `null` on any other feed. */
  readonly folder = computed<FolderResponse | null>(() =>
    this.filters.isFolder() ? (this.filters.folder() ?? null) : null,
  );
  /** The folder is pinned to the sidebar (the menu offers Unpin). */
  readonly pinned = computed(() => {
    const folder = this.folder();
    return folder !== null && this.pins.has(PIN_KIND.Folder, folder.id);
  });

  createSubfolder(): void {
    this.run((folder) => this.actions.create(folder));
  }

  addLinkHere(): void {
    this.run((folder) => this.actions.addLinkHere(folder));
  }

  rename(): void {
    this.run((folder) => this.actions.rename(folder));
  }

  settings(): void {
    this.run((folder) => this.actions.style(folder));
  }

  move(): void {
    this.run((folder) => this.actions.move(folder));
  }

  togglePin(): void {
    this.run((folder) =>
      this.pinned() ? this.pinActions.unpinFolder(folder) : this.pinActions.pinFolder(folder),
    );
  }

  share(): void {
    this.run((folder) => this.actions.share(folder));
  }

  remove(): void {
    this.run((folder) => this.actions.delete(folder));
  }

  private run(action: (folder: FolderResponse) => Promise<unknown>): void {
    const folder = this.folder();
    if (folder) {
      void action(folder);
    }
  }
}
