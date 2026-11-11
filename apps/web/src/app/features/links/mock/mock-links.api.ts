import { inject, Service } from '@angular/core';
import {
  LINK_BATCH_ERROR_CODE,
  LINK_IMAGE_PENDING_VERSION,
  LINK_LIMIT,
  LINK_SORT_FIELD,
  normalizeUrl,
  PAGE_LIMIT,
  RECENT_LINKS_WINDOW_DAYS,
  SORT_ORDER,
  type CaptureLinkImagesResponse,
  type CreateLinkRequest,
  type CreateLinksBatchRequest,
  type CreateLinksBatchResponse,
  type DeleteLinksBatchResponse,
  type LinkBatchItemError,
  type LinkPreviewResponse,
  type LinkResponse,
  type ListLinksQuery,
  type ListLinksResponse,
  type OpenLinkResponse,
  type RecentLinksQuery,
  type RecentLinksResponse,
  type UpdateLinkRequest,
} from '@shelfmark/contracts';
import { MOCK_LINK_PREVIEW_DUPLICATE } from '@shelfmark/contracts/testing';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { displayHost } from '../add-link/http-url';
import { MOCK_HOST } from '../models/mock-host.const';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../models/mock-links-scenario-key.const';
import type { LinksApi } from '../models/links-api.interface';
import { MockLibraryData } from './mock-library-data';
import { matchesQuery } from '../search-query';

const DAY_MS = 86_400_000;

/**
 * `LinksApi` over generated data with simulated latency, until the real API (#72). State is
 * in memory, so create / update / remove show up in later lists. `angular.dev/overview` answers
 * with the duplicate fixture, `unreachable.example` fails the preview, `save-fails.example` the
 * save, `patch-fails.example` an update and `delete-fails.example` a delete or a remove from history; the
 * `sessionStorage` key `sm-mock-links-scenario` (`empty` | `error`) changes what the feed lists.
 */
@Service()
export class MockLinksApi implements LinksApi {
  private readonly data = inject(MockLibraryData);
  /** Links created per `idempotencyKey`: the same key answers the same link, like the server. */
  private readonly created = new Map<string, LinkResponse>();
  /** Ids whose images were "captured" by `captureImages`. */
  private readonly captured = new Set<string>();
  /** Ids saved by `createBatch` whose capture has not run yet (pending images, like the server). */
  private readonly pending = new Set<string>();

  private get links(): LinkResponse[] {
    return this.data.links;
  }

  private set links(links: LinkResponse[]) {
    this.data.links = links;
  }

  preview(url: string): Observable<LinkPreviewResponse> {
    const host = displayHost(url);
    if (host === MOCK_HOST.Unreachable) {
      return throwError(() => new Error('Mock: preview failed')).pipe(
        delay(MOCK_LATENCY_MS.Preview),
      );
    }
    const normalized = normalizeUrl(url);
    if (normalized === normalizeUrl(MOCK_LINK_PREVIEW_DUPLICATE.preview.url)) {
      return of(MOCK_LINK_PREVIEW_DUPLICATE).pipe(delay(MOCK_LATENCY_MS.Preview));
    }
    // Like the server: a URL that is already saved (by normalised URL) comes with that link.
    const saved = this.links.find((link) => normalizeUrl(link.url) === normalized);
    const folder =
      saved === undefined || saved.folderId === null
        ? undefined
        : this.data.folderList.find((item) => item.id === saved.folderId);
    const response: LinkPreviewResponse = {
      preview: {
        url,
        title: `Page on ${host}`,
        description: `A preview of ${host}.`,
        imageUrl: null,
        faviconUrl: null,
      },
      duplicate: saved
        ? {
            id: saved.id,
            title: saved.title,
            folderId: saved.folderId,
            folderName: folder?.name ?? null,
          }
        : null,
      fetched: true,
    };
    return of(response).pipe(delay(MOCK_LATENCY_MS.Preview));
  }

  create(request: CreateLinkRequest): Observable<LinkResponse> {
    return defer(() => {
      if (displayHost(request.url) === MOCK_HOST.SaveFails) {
        return throwError(() => new Error('Mock: save failed'));
      }
      const replay =
        request.idempotencyKey === undefined ? undefined : this.created.get(request.idempotencyKey);
      if (replay) {
        return of({ ...replay });
      }
      const now = new Date().toISOString();
      const link: LinkResponse = {
        id: globalThis.crypto.randomUUID(),
        folderId: request.folderId ?? null,
        url: request.url,
        title: request.title ?? request.url,
        note: request.note ?? null,
        faviconUrl: null,
        imageUrl: null,
        isFavorite: false,
        lastOpenedAt: null,
        tags: request.tags ?? [],
        createdAt: now,
        updatedAt: now,
      };
      this.links = [link, ...this.links];
      this.data.ensureTags(link.tags);
      if (request.idempotencyKey !== undefined) {
        this.created.set(request.idempotencyKey, link);
      }
      return of({ ...link });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  list(query: ListLinksQuery = {}): Observable<ListLinksResponse> {
    return defer(() => {
      const scenario = readScenario();
      if (scenario === MOCK_LINKS_SCENARIO.Error) {
        return throwError(() => new Error('Mock: list failed'));
      }
      const matching = scenario === MOCK_LINKS_SCENARIO.Empty ? [] : this.filter(query);
      const sorted = sort(matching, query);
      const limit = query.limit ?? PAGE_LIMIT.Default;
      const offset = decodeCursor(query.cursor);
      const first = sorted[0]?.id;
      const items = sorted
        .slice(offset, offset + limit)
        .map((link) =>
          this.withImages(
            link,
            this.pending.has(link.id) ||
              (scenario === MOCK_LINKS_SCENARIO.PendingImages && link.id === first),
          ),
        );
      const next = offset + limit;
      return of<ListLinksResponse>({
        items,
        nextCursor: next < sorted.length ? encodeCursor(next) : null,
      });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  recent(query: RecentLinksQuery = {}): Observable<RecentLinksResponse> {
    return defer(() => {
      const since = Date.now() - RECENT_LINKS_WINDOW_DAYS * DAY_MS;
      const opened = this.links
        .filter((link) => link.lastOpenedAt !== null && Date.parse(link.lastOpenedAt) >= since)
        .sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))
        .slice(0, query.limit ?? PAGE_LIMIT.Default)
        .map((link) => ({ ...link }));
      return of<RecentLinksResponse>({ items: opened });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  removeRecent(id: string): Observable<void> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id && link.lastOpenedAt !== null);
      if (!current) {
        return throwError(() => new Error('Mock: not found'));
      }
      if (displayHost(current.url) === MOCK_HOST.DeleteFails) {
        return throwError(() => new Error('Mock: remove from history failed'));
      }
      this.links = this.links.map((link) =>
        link.id === id ? { ...link, lastOpenedAt: null } : link,
      );
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  clearRecent(): Observable<void> {
    return defer(() => {
      this.links = this.links.map((link) =>
        link.lastOpenedAt === null ? link : { ...link, lastOpenedAt: null },
      );
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  get(id: string): Observable<LinkResponse> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id);
      return current ? of({ ...current }) : throwError(() => new Error('Mock: get failed'));
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  update(id: string, request: UpdateLinkRequest): Observable<LinkResponse> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id);
      if (!current) {
        return throwError(() => new Error('Mock: update failed'));
      }
      if (displayHost(current.url) === MOCK_HOST.PatchFails) {
        return throwError(() => new Error('Mock: update failed'));
      }
      const updated: LinkResponse = {
        ...current,
        ...request,
        updatedAt: new Date().toISOString(),
      };
      this.links = this.links.map((link) => (link.id === id ? updated : link));
      this.data.ensureTags(updated.tags);
      return of({ ...updated });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(id: string): Observable<void> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id);
      if (current && displayHost(current.url) === MOCK_HOST.DeleteFails) {
        return throwError(() => new Error('Mock: delete failed'));
      }
      this.links = this.links.filter((link) => link.id !== id);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  open(id: string): Observable<OpenLinkResponse> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id);
      if (!current) {
        return throwError(() => new Error('Mock: update failed'));
      }
      const opened: LinkResponse = { ...current, lastOpenedAt: new Date().toISOString() };
      this.links = this.links.map((link) => (link.id === id ? opened : link));
      return of({ ...opened });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  captureImages(id: string): Observable<CaptureLinkImagesResponse> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id);
      if (!current) {
        return throwError(() => new Error('Mock: capture failed'));
      }
      this.captured.add(id);
      this.pending.delete(id);
      // Like the server: a link saved without a title gets the page title from this page load.
      if (current.title === current.url) {
        const titled = { ...current, title: `Page on ${displayHost(current.url)}` };
        this.links = this.links.map((link) => (link.id === id ? titled : link));
        return of(this.withImages(titled, false));
      }
      return of(this.withImages(current, false));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  /**
   * Mirrors `POST /api/links/batch`: replay by item key, a URL repeated within the batch or one
   * that is too long is skipped, the links are pending until `captureImages` ran. A batch with a
   * `save-fails.example` link fails as a whole.
   */
  createBatch(request: CreateLinksBatchRequest): Observable<CreateLinksBatchResponse> {
    return defer(() => {
      if (request.items.some((item) => displayHost(item.url) === MOCK_HOST.SaveFails)) {
        return throwError(() => new Error('Mock: save failed'));
      }
      const links: LinkResponse[] = [];
      const errors: LinkBatchItemError[] = [];
      const seen = new Set<string>();
      const fresh: LinkResponse[] = [];
      const now = Date.now();
      request.items.forEach((item, index) => {
        const normalized = normalizeUrl(item.url);
        if (normalized.length > LINK_LIMIT.UrlMax) {
          errors.push({ index, url: item.url, code: LINK_BATCH_ERROR_CODE.UrlTooLong });
          return;
        }
        if (seen.has(normalized)) {
          errors.push({ index, url: item.url, code: LINK_BATCH_ERROR_CODE.DuplicateInBatch });
          return;
        }
        seen.add(normalized);
        const replay = this.created.get(item.idempotencyKey);
        if (replay) {
          links.push({ ...replay });
          return;
        }
        // The first pasted link is the newest, as on the server.
        const at = new Date(now - fresh.length).toISOString();
        const link: LinkResponse = {
          id: globalThis.crypto.randomUUID(),
          folderId: request.folderId ?? null,
          url: item.url,
          title: item.title ?? item.url,
          note: null,
          faviconUrl: null,
          imageUrl: null,
          isFavorite: false,
          lastOpenedAt: null,
          tags: request.tags ?? [],
          createdAt: at,
          updatedAt: at,
        };
        this.created.set(item.idempotencyKey, link);
        this.pending.add(link.id);
        fresh.push(link);
        links.push(link);
      });
      this.links = [...fresh, ...this.links];
      this.data.ensureTags(request.tags ?? []);
      return of<CreateLinksBatchResponse>({
        links: links.map((link) => this.withImages(link, this.pending.has(link.id))),
        errors,
      });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  removeBatch(ids: readonly string[]): Observable<DeleteLinksBatchResponse> {
    return defer(() => {
      const wanted = new Set(ids);
      if (
        this.links.some(
          (link) => wanted.has(link.id) && displayHost(link.url) === MOCK_HOST.DeleteFails,
        )
      ) {
        return throwError(() => new Error('Mock: delete failed'));
      }
      const before = this.links.length;
      this.links = this.links.filter((link) => !wanted.has(link.id));
      for (const id of ids) {
        this.pending.delete(id);
      }
      return of<DeleteLinksBatchResponse>({ deleted: before - this.links.length });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  /** A copy of the link with the mock capture state applied: captured, pending or untouched. */
  private withImages(link: LinkResponse, pending: boolean): LinkResponse {
    if (this.captured.has(link.id)) {
      return {
        ...link,
        faviconUrl: `/api/links/${link.id}/favicon?v=0123456789abcdef`,
        imageUrl: `/api/links/${link.id}/image?v=0123456789abcdef`,
      };
    }
    return pending
      ? {
          ...link,
          faviconUrl: `/api/links/${link.id}/favicon?v=${LINK_IMAGE_PENDING_VERSION}`,
          imageUrl: `/api/links/${link.id}/image?v=${LINK_IMAGE_PENDING_VERSION}`,
        }
      : { ...link };
  }

  private filter(query: ListLinksQuery): LinkResponse[] {
    const wanted = (query.tag ?? []).map((name) => name.toLowerCase());
    return this.links.filter(
      (link) =>
        (query.folderId === undefined || link.folderId === query.folderId) &&
        (!query.unsorted || link.folderId === null) &&
        (query.favorite === undefined || link.isFavorite === query.favorite) &&
        wanted.every((tag) => link.tags.some((name) => name.toLowerCase() === tag)) &&
        (query.q === undefined || matchesQuery(link, query.q)),
    );
  }
}

function sort(links: LinkResponse[], query: ListLinksQuery): LinkResponse[] {
  const field = query.sort ?? LINK_SORT_FIELD.CreatedAt;
  const direction = (query.order ?? SORT_ORDER.Desc) === SORT_ORDER.Desc ? -1 : 1;
  const key = (link: LinkResponse): string =>
    field === LINK_SORT_FIELD.Title ? link.title.toLowerCase() : link[field];
  return [...links].sort((a, b) => direction * key(a).localeCompare(key(b)));
}

function encodeCursor(offset: number): string {
  return globalThis.btoa(String(offset));
}

function decodeCursor(cursor: string | undefined): number {
  if (cursor === undefined) {
    return 0;
  }
  const offset = Number(globalThis.atob(cursor));
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
}

function readScenario(): string | null {
  try {
    return globalThis.sessionStorage.getItem(MOCK_LINKS_SCENARIO_KEY);
  } catch {
    return null;
  }
}
