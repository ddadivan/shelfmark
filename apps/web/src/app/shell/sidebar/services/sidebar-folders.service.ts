import { computed, inject, Service, signal } from '@angular/core';
import { PIN_KIND } from '@shelfmark/contracts';
import type { UiTreeReorderEvent } from '@shelfmark/ui';
import { ReorderAnnouncer } from '../../../core/a11y/reorder-announcer.service';
import { FolderActionsService } from '../../../features/folders/services/folder-actions.service';
import { PinActionsService } from '../../../features/pins/services/pin-actions.service';
import { FoldersStore } from '../../../stores/folders.store';
import { PinsStore } from '../../../stores/pins.store';

/**
 * The folder menu and reorder of one sidebar: which folder the menu belongs to and what its items
 * do. Provided by the sidebar component, because the desktop sidebar and the phone drawer each
 * have their own menu.
 */
@Service()
export class SidebarFoldersService {
  private readonly folders = inject(FoldersStore);
  private readonly pins = inject(PinsStore);
  private readonly actions = inject(FolderActionsService);
  private readonly pinActions = inject(PinActionsService);
  private readonly announcer = inject(ReorderAnnouncer);

  /** `id` of the folder whose menu is open (the tree shows its button as pressed). */
  readonly menuNodeId = signal<string | null>(null);
  /** The folder of the open menu is pinned to the sidebar (the menu offers Unpin). */
  readonly menuPinned = computed(() => {
    const id = this.menuNodeId();
    return id !== null && this.pins.has(PIN_KIND.Folder, id);
  });
  /** The folder the menu was opened for; kept while an item is chosen and the menu closes. */
  private menuFolderId: string | null = null;

  /** The menu opens for the folder `id`. */
  openMenuFor(id: string): void {
    this.menuFolderId = id;
    this.menuNodeId.set(id);
  }

  menuClosed(): void {
    this.menuNodeId.set(null);
  }

  /** A folder row moved among its siblings (drag or Alt+Up / Alt+Down): said, then saved. */
  reorder(event: UiTreeReorderEvent): void {
    this.announcer.announce(event.fromIndex, event.toIndex, event.total);
    void this.actions.reorder(event.node.id, event.toIndex);
  }

  createTopLevel(): void {
    void this.actions.create();
  }

  togglePin(): void {
    const folder = this.menuFolder();
    if (folder) {
      void (this.pins.has(PIN_KIND.Folder, folder.id)
        ? this.pinActions.unpinFolder(folder)
        : this.pinActions.pinFolder(folder));
    }
  }

  style(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.style(folder);
    }
  }

  createSubfolder(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.create(folder);
    }
  }

  addLinkHere(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.addLinkHere(folder);
    }
  }

  rename(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.rename(folder);
    }
  }

  move(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.move(folder);
    }
  }

  share(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.share(folder);
    }
  }

  remove(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.delete(folder);
    }
  }

  private menuFolder() {
    return this.menuFolderId === null ? undefined : this.folders.entityMap()[this.menuFolderId];
  }
}
