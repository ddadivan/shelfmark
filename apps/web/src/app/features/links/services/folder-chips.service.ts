import { computed, inject, Service } from '@angular/core';
import { FoldersStore } from '../../../stores/folders.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import type { FolderChipView } from '../models/folder-chip-view.interface';

/**
 * The folder chips of the cards and rows in mixed feeds (#418: All links, Favorites, search,
 * tags, Recently opened): each folder's name, icon and shown colour, kept in step with the store.
 */
@Service()
export class FolderChipsService {
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);

  private readonly chips = computed(
    () =>
      new Map<string, FolderChipView>(
        this.folders.entities().map((folder) => [
          folder.id,
          {
            name: folder.name,
            icon: folder.icon,
            colour: this.settings.shownColour(folder.colour),
          },
        ]),
      ),
  );

  /** The chip of a link's folder; `null` for an unsorted link or a folder that is not loaded. */
  of(folderId: string | null): FolderChipView | null {
    return folderId === null ? null : (this.chips().get(folderId) ?? null);
  }
}
