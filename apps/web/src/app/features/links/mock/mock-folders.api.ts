import { inject, Service } from '@angular/core';
import {
  FOLDER_DEFAULT_COLOUR,
  FOLDER_DEFAULT_ICON,
  FOLDER_LIMIT,
  type CreateFolderRequest,
  type FolderDeleteMode,
  type FolderResponse,
  type ListFoldersResponse,
  type ReorderFoldersRequest,
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
        colour: FOLDER_DEFAULT_COLOUR,
        icon: FOLDER_DEFAULT_ICON,
        position: this.data.nextFolderPosition(parentId),
        pinned: false,
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
        colour: request.colour ?? current.colour,
        icon: request.icon ?? current.icon,
        // A move goes to the end of the new parent, like the API.
        position:
          parentId === current.parentId ? current.position : this.data.nextFolderPosition(parentId),
        updatedAt: new Date().toISOString(),
      };
      this.data.setFolders(
        this.data.folderList.map((folder) => (folder.id === id ? updated : folder)),
      );
      return of({ ...updated });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  /**
   * Like the API: `ids` must be exactly the subfolders of `parentId` (else the request fails); the
   * order is not an edit, so `updatedAt` stays.
   */
  reorder(request: ReorderFoldersRequest): Observable<ListFoldersResponse> {
    return defer(() => {
      const siblings = this.data.folderList.filter(
        (folder) => folder.parentId === request.parentId,
      );
      const wanted = new Set(request.ids);
      if (
        (request.parentId !== null && !this.find(request.parentId)) ||
        wanted.size !== request.ids.length ||
        siblings.length !== request.ids.length ||
        siblings.some((folder) => !wanted.has(folder.id)) ||
        siblings.some((folder) => folder.name === MOCK_FOLDER_NAME.UpdateFails)
      ) {
        return throwError(() => new Error('Mock: folder reorder failed'));
      }
      const place = new Map(request.ids.map((id, index) => [id, index]));
      this.data.setFolders(
        this.data.folderList.map((folder) => {
          const position = place.get(folder.id);
          return position === undefined ? folder : { ...folder, position };
        }),
      );
      return of<ListFoldersResponse>({
        items: this.data.foldersView(),
        counts: this.data.counts(),
      });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(id: string, mode: FolderDeleteMode): Observable<void> {
    return defer(() => {
      const current = this.find(id);
      if (!current || current.name === MOCK_FOLDER_NAME.DeleteFails) {
        return throwError(() => new Error('Mock: folder delete failed'));
      }
      this.data.trashFolder(id, mode);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private find(id: string): FolderResponse | undefined {
    return this.data.folderList.find((folder) => folder.id === id);
  }
}
