import { inject, Service } from '@angular/core';
import {
  TRASH_ITEM_KIND,
  TRASH_LIMIT,
  type ListTrashResponse,
  type TrashActionResponse,
  type TrashItem,
  type TrashItemRef,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of } from 'rxjs';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { TrashApi } from '../models/trash-api.interface';
import type { MockTrashEntry } from './models/mock-trash-entry.interface';

/**
 * `TrashApi` over the shared in-memory library, with simulated latency. A link or folder deleted
 * through the links or folders mock lands here (one entry per delete, a folder entry with its
 * link count); restoring puts it back like the server: a link whose folder is gone goes to
 * Unsorted, a folder whose parent is gone to the top level. The retention is the mock account
 * setting (`MockUserSettingsApi`).
 */
@Service()
export class MockTrashApi implements TrashApi {
  private readonly data = inject(MockLibraryData);

  list(): Observable<ListTrashResponse> {
    return defer(() => {
      const entries = this.data.trash;
      const retentionDays = this.data.trashRetentionDays;
      return of<ListTrashResponse>({
        items: entries.slice(0, TRASH_LIMIT.ListMax).map((entry) => toItem(entry, retentionDays)),
        total: entries.length,
        retentionDays,
      });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  restore(items: readonly TrashItemRef[]): Observable<TrashActionResponse> {
    return defer(() => {
      const entries = this.pick(items);
      if (entries.length === 0 && items.length > 0) {
        return of<TrashActionResponse>({ count: 0 });
      }
      for (const entry of entries) {
        this.restoreEntry(entry);
      }
      this.drop(entries);
      return of<TrashActionResponse>({ count: entries.length });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  deleteForever(items: readonly TrashItemRef[]): Observable<TrashActionResponse> {
    return defer(() => {
      const entries = this.pick(items);
      this.drop(entries);
      return of<TrashActionResponse>({ count: entries.length });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  empty(): Observable<TrashActionResponse> {
    return defer(() => {
      const count = this.data.trash.length;
      this.data.trash = [];
      return of<TrashActionResponse>({ count });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private pick(items: readonly TrashItemRef[]): MockTrashEntry[] {
    if (items.length === 0 || items.length > TRASH_LIMIT.BatchMax) {
      return [];
    }
    return this.data.trash.filter((entry) =>
      items.some((item) => item.kind === entry.kind && item.id === entry.id),
    );
  }

  private drop(entries: readonly MockTrashEntry[]): void {
    this.data.trash = this.data.trash.filter((entry) => !entries.includes(entry));
  }

  private restoreEntry(entry: MockTrashEntry): void {
    if (entry.kind === TRASH_ITEM_KIND.Link && entry.link) {
      const folderId = this.isLive(entry.link.folderId) ? entry.link.folderId : null;
      this.data.links = [{ ...entry.link, folderId }, ...this.data.links];
      return;
    }
    const [root, ...rest] = entry.folders;
    if (!root) {
      return;
    }
    const parentId = this.isLive(root.parentId) ? root.parentId : null;
    this.data.setFolders([...this.data.folderList, { ...root, parentId }, ...rest]);
    this.data.links = [...entry.links, ...this.data.links];
  }

  private isLive(folderId: string | null): folderId is string {
    return folderId !== null && this.data.folderList.some((folder) => folder.id === folderId);
  }
}

function toItem(entry: MockTrashEntry, retentionDays: number): TrashItem {
  const expiresAt = new Date(
    Date.parse(entry.deletedAt) + retentionDays * MS_PER_DAY,
  ).toISOString();
  const { link, folders } = entry;
  if (entry.kind === TRASH_ITEM_KIND.Link && link) {
    return {
      kind: TRASH_ITEM_KIND.Link,
      id: link.id,
      title: link.title,
      url: link.url,
      faviconUrl: link.faviconUrl,
      imageUrl: link.imageUrl,
      fromFolderName: entry.fromFolderName,
      linkCount: null,
      deletedAt: entry.deletedAt,
      expiresAt,
    };
  }
  const root = folders[0];
  if (!root) {
    throw new Error('Mock: broken trash entry');
  }
  return {
    kind: TRASH_ITEM_KIND.Folder,
    id: root.id,
    title: root.name,
    url: null,
    faviconUrl: null,
    imageUrl: null,
    fromFolderName: entry.fromFolderName,
    linkCount: entry.links.length,
    deletedAt: entry.deletedAt,
    expiresAt,
  };
}
