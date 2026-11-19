import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  deriveLinkKind,
  FOLDER_DEFAULT_COLOUR,
  FOLDER_DEFAULT_ICON,
  FOLDER_DELETE_MODE,
  FOLDER_ERROR_MESSAGE,
  FOLDER_LIMIT,
  IMPORT_ERROR_MESSAGE,
  IMPORT_LIMIT,
  LINK_BATCH_ERROR_CODE,
  LINK_LIMIT,
  linkLimitMessage,
  normalizeUrl,
  type FinishImportRequest,
  type FolderResponse,
  type ImportCheckResponse,
  type ImportFolderId,
  type ImportLinksRequest,
  type ImportLinksResponse,
  type LinkBatchItemError,
  type LinkResponse,
  type ListImportsResponse,
  type StartImportRequest,
  type StartImportResponse,
  type UndoImportResponse,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { normalizeLinkTags } from '../../links/mock/normalize-link-tags';
import { MOCK_HOST } from '../../links/models/mock-host.const';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import { displayHost } from '../../links/utils/http-url';
import type { ImportApi } from '../models/import-api.interface';
import type { MockImportRecord } from './models/mock-import-record.interface';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `ImportApi` over the in-memory mock library, following the API (ADR 0056): the start creates
 * the folders, batches create links with their tags, Undo moves what the import created to Trash.
 * A batch with a link on `MOCK_HOST.SaveFails` fails, so the summary's "failed" can be shown.
 */
@Service()
export class MockImportApi implements ImportApi {
  private readonly data = inject(MockLibraryData);
  private imports: MockImportRecord[] = [];
  /** Idempotency keys already used, with their link. */
  private readonly created = new Map<string, string>();

  list(): Observable<ListImportsResponse> {
    return defer(() => {
      const since = Date.now() - IMPORT_LIMIT.UndoDays * DAY_MS;
      const live = new Set(this.data.folderList.map((folder) => folder.id));
      const items = this.imports
        .filter((record) => !record.undone && Date.parse(record.summary.createdAt) >= since)
        .slice(0, IMPORT_LIMIT.RecentMax)
        .map((record) => ({
          ...record.summary,
          targetFolderId:
            record.summary.targetFolderId !== null && live.has(record.summary.targetFolderId)
              ? record.summary.targetFolderId
              : null,
        }));
      return of({ items });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  check(urls: readonly string[]): Observable<ImportCheckResponse> {
    return defer(() => {
      const saved = new Set(this.data.links.map((link) => normalizeUrl(link.url)));
      const indexes = urls.flatMap((url, index) => (saved.has(normalizeUrl(url)) ? [index] : []));
      return of({ saved: indexes });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  start(request: StartImportRequest): Observable<StartImportResponse> {
    return defer(() => {
      if (request.targetFolderId !== undefined && request.newFolderName !== undefined) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.BadRequest, IMPORT_ERROR_MESSAGE.TargetBoth),
        );
      }
      if (
        request.targetFolderId !== undefined &&
        !this.data.folderList.some((folder) => folder.id === request.targetFolderId)
      ) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.NotFound, FOLDER_ERROR_MESSAGE.NotFound),
        );
      }
      const adding = request.folders.length + (request.newFolderName === undefined ? 0 : 1);
      if (this.data.folderList.length + adding > FOLDER_LIMIT.PerUserMax) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.Conflict, IMPORT_ERROR_MESSAGE.FoldersLimit),
        );
      }
      const id = globalThis.crypto.randomUUID();
      const folderIds = new Set<string>();
      let targetFolderId = request.targetFolderId ?? null;
      if (request.newFolderName !== undefined) {
        targetFolderId = this.addFolder(request.newFolderName, null);
        folderIds.add(targetFolderId);
      }
      const mapped = new Map<string, string>();
      const folders: ImportFolderId[] = [];
      for (const folder of request.folders) {
        const parent = folder.parentKey === null ? targetFolderId : mapped.get(folder.parentKey);
        const folderId = this.addFolder(folder.name, parent ?? null);
        mapped.set(folder.key, folderId);
        folderIds.add(folderId);
        folders.push({ key: folder.key, id: folderId });
      }
      this.imports = [
        {
          summary: {
            id,
            source: request.source,
            fileName: request.fileName,
            createdAt: new Date().toISOString(),
            finishedAt: null,
            targetFolderId,
            linksCreated: 0,
            foldersCreated: folderIds.size,
            skipped: 0,
            failed: 0,
          },
          folderIds,
          linkIds: new Set(),
          tagNames: [],
          undone: false,
        },
        ...this.imports,
      ];
      return of({ id, targetFolderId, folders });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  addLinks(id: string, request: ImportLinksRequest): Observable<ImportLinksResponse> {
    return defer(() => {
      const record = this.imports.find((item) => item.summary.id === id);
      if (!record) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.NotFound, IMPORT_ERROR_MESSAGE.NotFound),
        );
      }
      if (record.undone) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.Conflict, IMPORT_ERROR_MESSAGE.Closed),
        );
      }
      if (request.items.some((item) => displayHost(item.url) === MOCK_HOST.SaveFails)) {
        return throwError(() => new Error('Mock: import batch failed'));
      }
      const fresh = request.items.filter((item) => !this.created.has(item.idempotencyKey));
      if (this.data.links.length + fresh.length > LINK_LIMIT.PerUserMax) {
        return throwError(() =>
          mockHttpError(
            HttpStatusCode.Conflict,
            linkLimitMessage(LINK_LIMIT.PerUserMax - this.data.links.length),
          ),
        );
      }
      const known = new Set(this.data.tagList.map((tag) => tag.name.toLowerCase()));
      const errors: LinkBatchItemError[] = [];
      const seen = new Set<string>();
      const links: LinkResponse[] = [];
      let replayed = 0;
      const now = Date.now();
      request.items.forEach((item, index) => {
        const normalized = normalizeUrl(item.url);
        if (request.skipRepeats !== false && seen.has(normalized)) {
          errors.push({ index, url: item.url, code: LINK_BATCH_ERROR_CODE.DuplicateInBatch });
          return;
        }
        seen.add(normalized);
        if (this.created.has(item.idempotencyKey)) {
          replayed += 1;
          return;
        }
        const at = item.addedAt ?? new Date(now - links.length).toISOString();
        const link: LinkResponse = {
          id: globalThis.crypto.randomUUID(),
          folderId: item.folderId ?? record.summary.targetFolderId,
          url: item.url,
          title: item.title ?? item.url,
          kind: deriveLinkKind(item.url),
          note: item.note ?? null,
          faviconUrl: null,
          imageUrl: null,
          isFavorite: false,
          pinnedInFolderAt: null,
          pinned: false,
          lastOpenedAt: null,
          remindAt: null,
          tags: normalizeLinkTags(item.tags ?? []),
          summary: null,
          summarySource: null,
          aiStatus: null,
          createdAt: at,
          updatedAt: at,
        };
        this.created.set(item.idempotencyKey, link.id);
        record.linkIds.add(link.id);
        links.push(link);
      });
      const newTags = [...new Set(links.flatMap((link) => link.tags))].filter(
        (name) => !known.has(name.toLowerCase()),
      );
      record.tagNames.push(...newTags);
      this.data.links = [...links, ...this.data.links];
      this.data.ensureTags(newTags);
      record.summary = {
        ...record.summary,
        linksCreated: record.summary.linksCreated + links.length,
      };
      return of({ created: links.length, replayed, errors });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  finish(id: string, request: FinishImportRequest): Observable<void> {
    return defer(() => {
      const record = this.imports.find((item) => item.summary.id === id);
      if (!record) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.NotFound, IMPORT_ERROR_MESSAGE.NotFound),
        );
      }
      record.summary = {
        ...record.summary,
        skipped: request.skipped,
        failed: request.failed,
        finishedAt: new Date().toISOString(),
      };
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  undo(id: string): Observable<UndoImportResponse> {
    return defer(() => {
      const record = this.imports.find((item) => item.summary.id === id);
      if (!record) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.NotFound, IMPORT_ERROR_MESSAGE.NotFound),
        );
      }
      if (record.undone) {
        return throwError(() =>
          mockHttpError(HttpStatusCode.Conflict, IMPORT_ERROR_MESSAGE.UndoGone),
        );
      }
      return of(this.undoRecord(record));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  /** Like the API: what the user added is moved out first, then one Trash entry per top folder. */
  private undoRecord(record: MockImportRecord): UndoImportResponse {
    const ours = (folderId: string | null): boolean =>
      folderId !== null && record.folderIds.has(folderId);
    this.data.links = this.data.links.map((link) =>
      ours(link.folderId) && !record.linkIds.has(link.id)
        ? { ...link, folderId: null, pinnedInFolderAt: null }
        : link,
    );
    this.data.setFolders(
      this.data.folderList.map((folder) =>
        ours(folder.parentId) && !record.folderIds.has(folder.id)
          ? { ...folder, parentId: null }
          : folder,
      ),
    );
    const liveFolders = this.data.folderList.filter((folder) => record.folderIds.has(folder.id));
    const liveLinks = this.data.links.filter((link) => record.linkIds.has(link.id));
    for (const folder of liveFolders.filter((item) => !ours(item.parentId))) {
      this.data.trashFolder(folder.id, FOLDER_DELETE_MODE.DeleteLinks);
    }
    for (const link of this.data.links.filter((item) => record.linkIds.has(item.id))) {
      this.data.trashLink(link);
    }
    const inUse = new Set(
      this.data.links.flatMap((link) => link.tags.map((name) => name.toLowerCase())),
    );
    const gone = record.tagNames.filter((name) => !inUse.has(name.toLowerCase()));
    const goneKeys = new Set(gone.map((name) => name.toLowerCase()));
    this.data.setTags(this.data.tagList.filter((tag) => !goneKeys.has(tag.name.toLowerCase())));
    record.undone = true;
    return { links: liveLinks.length, folders: liveFolders.length, tags: gone.length };
  }

  private addFolder(name: string, parentId: string | null): string {
    const now = new Date().toISOString();
    const folder: FolderResponse = {
      id: globalThis.crypto.randomUUID(),
      parentId,
      name,
      colour: FOLDER_DEFAULT_COLOUR,
      icon: FOLDER_DEFAULT_ICON,
      highlighted: false,
      description: null,
      coverLinkId: null,
      coverUrl: null,
      position: this.data.nextFolderPosition(parentId),
      pinned: false,
      linkCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.setFolders([...this.data.folderList, folder]);
    return folder.id;
  }
}
