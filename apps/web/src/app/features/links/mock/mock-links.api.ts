import { inject, Service } from '@angular/core';
import {
  LINK_SORT_FIELD,
  PAGE_LIMIT,
  SORT_ORDER,
  type CreateLinkRequest,
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
import { normalizeUrl } from './normalize-url';

/**
 * `LinksApi` over generated data with simulated latency, until the real API (#72). State is
 * in memory, so create / update / remove show up in later lists. `angular.dev/overview` answers
 * with the duplicate fixture, `unreachable.example` fails the preview, `save-fails.example` the
 * save, `patch-fails.example` an update and `delete-fails.example` a delete; the
 * `sessionStorage` key `sm-mock-links-scenario` (`empty` | `error`) changes what the feed lists.
 */
@Service()
export class MockLinksApi implements LinksApi {
  private readonly data = inject(MockLibraryData);

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
    if (
      normalized !== null &&
      normalized === normalizeUrl(MOCK_LINK_PREVIEW_DUPLICATE.preview.url)
    ) {
      return of(MOCK_LINK_PREVIEW_DUPLICATE).pipe(delay(MOCK_LATENCY_MS.Preview));
    }
    const response: LinkPreviewResponse = {
      preview: {
        url,
        title: `Page on ${host}`,
        description: `A preview of ${host}.`,
        imageUrl: null,
        faviconUrl: null,
      },
      duplicate: null,
      fetched: true,
    };
    return of(response).pipe(delay(MOCK_LATENCY_MS.Preview));
  }

  create(request: CreateLinkRequest): Observable<LinkResponse> {
    return defer(() => {
      if (displayHost(request.url) === MOCK_HOST.SaveFails) {
        return throwError(() => new Error('Mock: save failed'));
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
      const items = sorted.slice(offset, offset + limit).map((link) => ({ ...link }));
      const next = offset + limit;
      return of<ListLinksResponse>({
        items,
        nextCursor: next < sorted.length ? encodeCursor(next) : null,
      });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  recent(query: RecentLinksQuery = {}): Observable<RecentLinksResponse> {
    return defer(() => {
      const opened = this.links
        .filter((link) => link.lastOpenedAt !== null)
        .sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))
        .slice(0, query.limit ?? PAGE_LIMIT.Default)
        .map((link) => ({ ...link }));
      return of<RecentLinksResponse>({ items: opened });
    }).pipe(delay(MOCK_LATENCY_MS.List));
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

  private filter(query: ListLinksQuery): LinkResponse[] {
    const q = query.q?.toLowerCase();
    const wanted = (query.tag ?? []).map((name) => name.toLowerCase());
    return this.links.filter(
      (link) =>
        (query.folderId === undefined || link.folderId === query.folderId) &&
        (!query.unsorted || link.folderId === null) &&
        (query.favorite === undefined || link.isFavorite === query.favorite) &&
        wanted.every((tag) => link.tags.some((name) => name.toLowerCase() === tag)) &&
        (q === undefined || link.title.toLowerCase().includes(q)),
    );
  }
}

function sort(links: LinkResponse[], query: ListLinksQuery): LinkResponse[] {
  const field = query.sort ?? LINK_SORT_FIELD.CreatedAt;
  const direction = (query.order ?? SORT_ORDER.Desc) === SORT_ORDER.Desc ? -1 : 1;
  return [...links].sort((a, b) => direction * a[field].localeCompare(b[field]));
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
