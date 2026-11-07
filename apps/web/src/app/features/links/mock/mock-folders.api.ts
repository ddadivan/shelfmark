import { inject, Service } from '@angular/core';
import {
  FOLDER_DELETE_MODE,
  FOLDER_LIMIT,
  type CreateFolderRequest,
  type FolderDeleteMode,
  type FolderResponse,
  type ListFoldersResponse,
  type UpdateFolderRequest,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import type { FoldersApi } from '../models/folders-api.interface';
import { MOCK_FOLDER_NAME } from '../models/mock-folder-name.const';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';
import { MockLibraryData } from './mock-library-data';

/**
 * `FoldersApi` over the shared in-memory library, with simulated latency. Folders named like
 * `MOCK_FOLDER_NAME` fail on create, update or delete. Cycles, a missing parent and the
 * per-user limit are rejected like the real API would.
 */
@Service()
export class MockFoldersApi implements FoldersApi {
  private readonly data = inject(MockLibraryData);

  list(): Observable<ListFoldersResponse> {
    return defer(() =>
      of<ListFoldersResponse>({ items: this.data.foldersView(), counts: this.data.counts() }),
    ).pipe(delay(MOCK_LATENCY_MS.List));
  }

  create(request: CreateFolderRequest): Observable<FolderResponse> {
    return defer(() => {
      const parentId = request.parentId ?? null;
      if (
        request.name === MOCK_FOLDER_NAME.CreateFails ||
        this.data.folderList.length >= FOLDER_LIMIT.PerUserMax ||
        (parentId !== null && !this.find(parentId))
      ) {
        return throwError(() => new Error('Mock: folder create failed'));
      }
      const now = new Date().toISOString();
      const folder: FolderResponse = {
        id: globalThis.crypto.randomUUID(),
        parentId,
        name: request.name,
        linkCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      this.data.setFolders([...this.data.folderList, folder]);
      return of({ ...folder });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  update(id: string, request: UpdateFolderRequest): Observable<FolderResponse> {
    return defer(() => {
      const current = this.find(id);
      const parentId = request.parentId === undefined ? current?.parentId : request.parentId;
      if (
        !current ||
        current.name === MOCK_FOLDER_NAME.UpdateFails ||
        parentId === undefined ||
        (parentId !== null && (!this.find(parentId) || this.data.subtreeIds(id).includes(parentId)))
      ) {
        return throwError(() => new Error('Mock: folder update failed'));
      }
      const updated: FolderResponse = {
        ...current,
        name: request.name ?? current.name,
        parentId,
        updatedAt: new Date().toISOString(),
      };
      this.data.setFolders(
        this.data.folderList.map((folder) => (folder.id === id ? updated : folder)),
      );
      return of({ ...updated });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(id: string, mode: FolderDeleteMode): Observable<void> {
    return defer(() => {
      const current = this.find(id);
      if (!current || current.name === MOCK_FOLDER_NAME.DeleteFails) {
        return throwError(() => new Error('Mock: folder delete failed'));
      }
      const doomed = new Set(this.data.subtreeIds(id));
      const inDoomed = (folderId: string | null): boolean =>
        folderId !== null && doomed.has(folderId);
      this.data.links =
        mode === FOLDER_DELETE_MODE.DeleteLinks
          ? this.data.links.filter((link) => !inDoomed(link.folderId))
          : this.data.links.map((link) =>
              inDoomed(link.folderId) ? { ...link, folderId: null } : link,
            );
      this.data.setFolders(this.data.folderList.filter((folder) => !doomed.has(folder.id)));
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private find(id: string): FolderResponse | undefined {
    return this.data.folderList.find((folder) => folder.id === id);
  }
}
