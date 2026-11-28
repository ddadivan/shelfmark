import { inject, Service } from '@angular/core';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { SafeStorage } from '../../../core/storage/safe-storage.service';

/** The folders kept: the most recently seen ones, so the key stays small. */
const MAX_FOLDERS = 40;
/** More chips than this are not held: they wrap over rows nobody can predict. */
const MAX_SLOTS = 9;

/**
 * How many subfolders each folder page showed the last time (folder id to count in
 * `localStorage`), for the room they take above the cards. The subfolders come from the folder
 * list, which answers after the page has started, and a chip row moves the feed by 64px when it
 * arrives: the in-app skeleton (`LibraryFeedService.subfolderSlots`) and `public/boot-skeleton.js`
 * hold the row from this count. The breadcrumb trail needs no entry: every folder page has one, so
 * its room is known from the address. Never read as data: the folder list stays the truth.
 */
@Service()
export class FolderShapeCache {
  private readonly storage = inject(SafeStorage);
  private shape = this.read();

  /** The subfolder count the folder had last time, 0 when unknown or none (capped). */
  subfolders(folderId: string): number {
    return Math.min(this.shape[folderId] ?? 0, MAX_SLOTS);
  }

  /** Keeps the count of a folder that was shown with its folder list loaded. */
  remember(folderId: string, subfolders: number): void {
    if ((this.shape[folderId] ?? 0) === subfolders) {
      return;
    }
    const next = { ...this.shape };
    delete next[folderId];
    if (subfolders > 0) {
      next[folderId] = subfolders;
    }
    const ids = Object.keys(next);
    for (const old of ids.slice(0, Math.max(0, ids.length - MAX_FOLDERS))) {
      delete next[old];
    }
    this.shape = next;
    this.storage.setJson(STORAGE_KEY.FolderShape, next);
  }

  private read(): Record<string, number> {
    const stored = this.storage.getJsonValue(STORAGE_KEY.FolderShape);
    const shape: Record<string, number> = {};
    if (stored !== null && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [id, count] of Object.entries(stored)) {
        if (typeof count === 'number' && Number.isInteger(count) && count > 0) {
          shape[id] = count;
        }
      }
    }
    return shape;
  }
}
