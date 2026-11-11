import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  SHARE_ERROR_MESSAGE,
  SHARE_LIMIT,
  type FolderShareResponse,
  type PublicCollectionQuery,
  type PublicCollectionResponse,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { AuthStore } from '../../../core/auth/auth.store';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { MockShareRecord } from '../models/mock-share-record.interface';
import { MOCK_SHARES_STORAGE_KEY } from '../models/mock-shares-storage-key.const';
import type { SharesApi } from '../models/shares-api.interface';

function isRecord(value: unknown): value is MockShareRecord {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Record<keyof MockShareRecord, unknown>>;
  return (
    typeof candidate.token === 'string' &&
    typeof candidate.folderId === 'string' &&
    typeof candidate.showNotes === 'boolean' &&
    typeof candidate.ownerName === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}

function newToken(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(SHARE_LIMIT.TokenBytes));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function httpError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { statusCode: status, message } });
}

/**
 * `SharesApi` over the shared in-memory library, like the real API: demo users get 403, at most
 * `SHARE_LIMIT.PerUserMax` public folders (409), unknown tokens 404, notes only when allowed.
 * The public links live in `localStorage` (`MOCK_SHARES_STORAGE_KEY`), so a reload keeps them.
 */
@Service()
export class MockSharesApi implements SharesApi {
  private readonly data = inject(MockLibraryData);
  private readonly auth = inject(AuthStore);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  get(folderId: string): Observable<FolderShareResponse> {
    return this.answer(() => this.response(folderId));
  }

  enable(folderId: string): Observable<FolderShareResponse> {
    return this.answer(() => {
      if (this.auth.user()?.isDemo) {
        throw httpError(HttpStatusCode.Forbidden, SHARE_ERROR_MESSAGE.DemoUser);
      }
      const records = this.records();
      if (!records.some((record) => record.folderId === folderId)) {
        if (records.length >= SHARE_LIMIT.PerUserMax) {
          throw httpError(HttpStatusCode.Conflict, SHARE_ERROR_MESSAGE.LimitReached);
        }
        const [ownerName = ''] = (this.auth.user()?.name ?? '').trim().split(/\s+/u);
        this.save([
          ...records,
          {
            token: newToken(),
            folderId,
            showNotes: false,
            ownerName,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return this.response(folderId);
    });
  }

  setShowNotes(folderId: string, showNotes: boolean): Observable<FolderShareResponse> {
    return this.answer(() => {
      this.update(folderId, (record) => ({ ...record, showNotes }));
      return this.response(folderId);
    });
  }

  reset(folderId: string): Observable<FolderShareResponse> {
    return this.answer(() => {
      this.update(folderId, (record) => ({
        ...record,
        token: newToken(),
        createdAt: new Date().toISOString(),
      }));
      return this.response(folderId);
    });
  }

  disable(folderId: string): Observable<void> {
    return this.answer(() => {
      this.requireFolder(folderId);
      this.save(this.records().filter((record) => record.folderId !== folderId));
    });
  }

  collection(token: string, query: PublicCollectionQuery): Observable<PublicCollectionResponse> {
    return this.answer(() => {
      const record = this.records().find((entry) => entry.token === token);
      const root = record && this.data.folderList.find((folder) => folder.id === record.folderId);
      if (!record || !root) throw httpError(HttpStatusCode.NotFound, SHARE_ERROR_MESSAGE.NotFound);
      const ids = this.data.subtreeIds(root.id);
      if (query.folder !== undefined && !ids.includes(query.folder)) {
        throw httpError(HttpStatusCode.NotFound, SHARE_ERROR_MESSAGE.NotFound);
      }
      const scope = query.folder === undefined ? ids : this.data.subtreeIds(query.folder);
      const inSubtree = (folderIds: readonly string[]) =>
        this.data.links.filter(
          (link) => link.folderId !== null && folderIds.includes(link.folderId),
        );
      const all = inSubtree(ids);
      const scoped = inSubtree(scope).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const page = query.page ?? 1;
      const skip = (page - 1) * SHARE_LIMIT.PageSize;
      const items = scoped.slice(skip, Math.min(skip + SHARE_LIMIT.PageSize, SHARE_LIMIT.MaxLinks));
      const updatedAt = [root.updatedAt, ...all.map((link) => link.updatedAt)].sort().at(-1);
      return {
        ownerName: record.ownerName,
        name: root.name,
        linkCount: all.length,
        updatedAt: updatedAt ?? root.updatedAt,
        subfolders: this.data.folderList
          .filter((folder) => folder.parentId === root.id)
          .map((folder) => ({
            id: folder.id,
            name: folder.name,
            linkCount: inSubtree(this.data.subtreeIds(folder.id)).length,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        items: items.map((link) => ({
          id: link.id,
          url: link.url,
          title: link.title,
          note: record.showNotes ? link.note : null,
          faviconUrl: null,
          imageUrl: null,
        })),
        page,
        hasMore: skip + items.length < Math.min(scoped.length, SHARE_LIMIT.MaxLinks),
      };
    });
  }

  private answer<T>(run: () => T): Observable<T> {
    return defer(() => {
      try {
        return of(run());
      } catch (error) {
        return throwError(() => error);
      }
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private requireFolder(folderId: string): void {
    if (!this.data.folderList.some((folder) => folder.id === folderId)) {
      throw httpError(HttpStatusCode.NotFound, 'Folder not found');
    }
  }

  private response(folderId: string): FolderShareResponse {
    this.requireFolder(folderId);
    const record = this.records().find((entry) => entry.folderId === folderId);
    return record
      ? {
          folderId,
          enabled: true,
          token: record.token,
          showNotes: record.showNotes,
          createdAt: record.createdAt,
        }
      : { folderId, enabled: false, token: null, showNotes: false, createdAt: null };
  }

  private update(folderId: string, change: (record: MockShareRecord) => MockShareRecord): void {
    this.requireFolder(folderId);
    const records = this.records();
    if (!records.some((record) => record.folderId === folderId)) {
      throw httpError(HttpStatusCode.NotFound, SHARE_ERROR_MESSAGE.NotFound);
    }
    this.save(records.map((record) => (record.folderId === folderId ? change(record) : record)));
  }

  private records(): MockShareRecord[] {
    try {
      const parsed: unknown = JSON.parse(this.storage?.getItem(MOCK_SHARES_STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
    } catch {
      return [];
    }
  }

  private save(records: readonly MockShareRecord[]): void {
    this.storage?.setItem(MOCK_SHARES_STORAGE_KEY, JSON.stringify(records));
  }
}
