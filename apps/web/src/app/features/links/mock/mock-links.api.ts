import { inject, Service } from '@angular/core';
import {
  deriveLinkKind,
  LINK_BATCH_ERROR_CODE,
  LINK_IMAGE_PENDING_VERSION,
  LINK_LIMIT,
  LINK_SORT_FIELD,
  normalizeUrl,
  stripTrackingParams,
  PAGE_LIMIT,
  RECENT_LINKS_WINDOW_DAYS,
  SORT_ORDER,
  normalizeTagName,
  type CaptureLinkImagesResponse,
  type CreateLinkRequest,
  type DeleteLinksBatchResponse,
  type UpdateLinksBatchRequest,
  type UpdateLinksBatchResponse,
  type CreateLinksBatchRequest,
  type CreateLinksBatchResponse,
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
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { displayHost } from '../utils/http-url';
import { MOCK_HOST } from '../models/mock-host.const';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';
import { MOCK_LINKS_SCENARIO } from '../models/mock-links-scenario.const';
import { MOCK_LINKS_SCENARIO_KEY } from '../models/mock-links-scenario-key.const';
import type { LinksApi } from '../models/links-api.interface';
import { MockLibraryData } from './mock-library-data';

const DAY_MS = 86_400_000;

/**
 * `LinksApi` over generated data with simulated latency, until the real API (#72). State is
 * in memory, so create / update / remove show up in later lists; a removed link waits in the mock Trash. `angular.dev/overview` answers
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

  preview(sentUrl: string): Observable<LinkPreviewResponse> {
    const url = this.savedUrl(sentUrl);
    const host = displayHost(url);
    if (!this.data.library.fetchPreviews) {
      // Like the API with "Fetch titles and previews" off: no page, only the duplicate check.
      const duplicate =
        normalizeUrl(url) === normalizeUrl(MOCK_LINK_PREVIEW_DUPLICATE.preview.url)
          ? MOCK_LINK_PREVIEW_DUPLICATE.duplicate
          : null;
      const bare: LinkPreviewResponse = {
        preview: {
          kind: deriveLinkKind(url),
          url,
          title: url,
          description: null,
          imageUrl: null,
          faviconUrl: null,
        },
        duplicate,
        fetched: false,
      };
      return of(bare).pipe(delay(MOCK_LATENCY_MS.Preview));
    }
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
        kind: deriveLinkKind(url),
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
      const url = this.savedUrl(request.url);
      const link: LinkResponse = {
        id: globalThis.crypto.randomUUID(),
        kind: request.kind ?? deriveLinkKind(url),
        folderId: request.folderId ?? null,
        url,
        title: request.title ?? url,
        note: request.note ?? null,
        faviconUrl: null,
        imageUrl: null,
        isFavorite: false,
        pinnedInFolderAt: null,
        pinned: false,
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

  /** Like the API: tracking parameters always go (#315). */
  private savedUrl(url: string): string {
    return stripTrackingParams(url);
  }

  list(query: ListLinksQuery = {}): Observable<ListLinksResponse> {
    return defer(() => {
      const scenario = readScenario();
      if (scenario === MOCK_LINKS_SCENARIO.Error) {
        return throwError(() => new Error('Mock: list failed'));
      }
      const matching = scenario === MOCK_LINKS_SCENARIO.Empty ? [] : this.filter(query);
      const inFolder = query.folderId !== undefined;
      // Like the API: in a folder the pinned links come first in `pinned` (page one only).
      const pinnedLinks = inFolder
        ? matching
            .filter((link) => link.pinnedInFolderAt !== null)
            .sort((a, b) => (a.pinnedInFolderAt ?? '').localeCompare(b.pinnedInFolderAt ?? ''))
        : [];
      const rest = inFolder ? matching.filter((link) => link.pinnedInFolderAt === null) : matching;
      const sorted = sort(rest, query);
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
        pinned:
          query.cursor === undefined ? pinnedLinks.map((link) => this.withImages(link, false)) : [],
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
        .map((link) => this.data.linkView(link));
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
      return current
        ? of(this.data.linkView(current))
        : throwError(() => new Error('Mock: get failed'));
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
      const { pinnedInFolder, ...fields } = request;
      const now = new Date().toISOString();
      const folderId = fields.folderId === undefined ? current.folderId : fields.folderId;
      let pinnedInFolderAt = folderId === current.folderId ? current.pinnedInFolderAt : null;
      if (pinnedInFolder === false) {
        pinnedInFolderAt = null;
      } else if (pinnedInFolder === true) {
        if (folderId === null) {
          return throwError(() => badRequest());
        }
        const taken = this.links.filter(
          (link) => link.folderId === folderId && link.pinnedInFolderAt !== null,
        ).length;
        if (current.pinnedInFolderAt === null && taken >= LINK_LIMIT.PinnedInFolderMax) {
          return throwError(
            () =>
              new HttpErrorResponse({ status: HttpStatusCode.Conflict, statusText: 'Conflict' }),
          );
        }
        pinnedInFolderAt = current.pinnedInFolderAt ?? now;
      }
      // Like the API: another page takes the kind of its host unless the request sets one.
      const kind =
        fields.kind ??
        (fields.url !== undefined && normalizeUrl(fields.url) !== normalizeUrl(current.url)
          ? deriveLinkKind(fields.url)
          : current.kind);
      const updated: LinkResponse = {
        ...current,
        ...fields,
        kind,
        pinnedInFolderAt,
        updatedAt: now,
      };
      this.links = this.links.map((link) => (link.id === id ? updated : link));
      this.data.ensureTags(updated.tags);
      return of(this.data.linkView(updated));
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(id: string): Observable<void> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id);
      if (current && displayHost(current.url) === MOCK_HOST.DeleteFails) {
        return throwError(() => new Error('Mock: delete failed'));
      }
      if (current) {
        this.data.trashLink(current);
      }
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  open(id: string): Observable<OpenLinkResponse> {
    return defer(() => {
      const current = this.links.find((link) => link.id === id);
      if (!current) {
        return throwError(() => new Error('Mock: update failed'));
      }
      // As the server: a paused history answers but records nothing.
      if (this.data.pauseHistory) {
        return of({ ...this.data.linkView(current), recorded: false });
      }
      const opened: LinkResponse = { ...current, lastOpenedAt: new Date().toISOString() };
      this.links = this.links.map((link) => (link.id === id ? opened : link));
      return of({ ...this.data.linkView(opened), recorded: true });
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
          kind: deriveLinkKind(item.url),
          note: null,
          faviconUrl: null,
          imageUrl: null,
          isFavorite: false,
          pinnedInFolderAt: null,
          pinned: false,
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

  /** A copy of the link with the mock capture state applied: captured, pending or untouched. */
  private withImages(source: LinkResponse, pending: boolean): LinkResponse {
    const link = this.data.linkView(source);
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

  /**
   * Like the API: live links among `ids` go to the mock Trash (bulk delete, and the Undo of a
   * paste); unknown ids count as nothing.
   */
  removeBatch(ids: readonly string[]): Observable<DeleteLinksBatchResponse> {
    return defer(() => {
      const wanted = new Set(ids);
      const hit = this.links.filter((link) => wanted.has(link.id));
      if (hit.some((link) => displayHost(link.url) === MOCK_HOST.DeleteFails)) {
        return throwError(() => new Error('Mock: delete failed'));
      }
      for (const link of hit) {
        this.data.trashLink(link);
        this.pending.delete(link.id);
      }
      return of<DeleteLinksBatchResponse>({ deleted: hit.length });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  /**
   * Like the API: one change for the live links among `ids`, all or nothing. An unknown folder is
   * a 404, a link past `TagsMax` a 409, a `patch-fails.example` link fails the whole request.
   */
  updateBatch(request: UpdateLinksBatchRequest): Observable<UpdateLinksBatchResponse> {
    return defer(() => {
      const wanted = new Set(request.ids);
      const hit = this.links.filter((link) => wanted.has(link.id));
      if (hit.some((link) => displayHost(link.url) === MOCK_HOST.PatchFails)) {
        return throwError(() => new Error('Mock: update failed'));
      }
      const { folderId } = request;
      if (
        typeof folderId === 'string' &&
        !this.data.folderList.some((folder) => folder.id === folderId)
      ) {
        return throwError(() => httpError(HttpStatusCode.NotFound, 'Not Found'));
      }
      const add = (request.addTags ?? []).map(normalizeTagName).filter((name) => name !== '');
      const remove = new Set(
        (request.removeTags ?? []).map((name) => normalizeTagName(name).toLowerCase()),
      );
      const now = new Date().toISOString();
      const changed = new Map<string, LinkResponse>();
      for (const link of hit) {
        let tags = link.tags.filter((name) => !remove.has(name.toLowerCase()));
        for (const name of add) {
          if (!tags.some((tag) => tag.toLowerCase() === name.toLowerCase())) {
            tags = [...tags, name];
          }
        }
        if (tags.length > LINK_LIMIT.TagsMax) {
          return throwError(() => httpError(HttpStatusCode.Conflict, 'Conflict'));
        }
        const nextFolder = folderId === undefined ? link.folderId : folderId;
        changed.set(link.id, {
          ...link,
          tags,
          folderId: nextFolder,
          pinnedInFolderAt: nextFolder === link.folderId ? link.pinnedInFolderAt : null,
          isFavorite: request.isFavorite ?? link.isFavorite,
          updatedAt: now,
        });
      }
      this.links = this.links.map((link) => changed.get(link.id) ?? link);
      this.data.ensureTags(add);
      const links = request.ids
        .map((id) => changed.get(id))
        .filter((link): link is LinkResponse => link !== undefined)
        .map((link) => this.data.linkView(link));
      return of<UpdateLinksBatchResponse>({ updated: links.length, links });
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private filter(query: ListLinksQuery): LinkResponse[] {
    return this.data.matching(query);
  }
}

function httpError(status: HttpStatusCode, statusText: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText });
}

function badRequest(): HttpErrorResponse {
  return new HttpErrorResponse({ status: HttpStatusCode.BadRequest, statusText: 'Bad Request' });
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
