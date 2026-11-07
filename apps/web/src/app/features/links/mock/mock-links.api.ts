import { Service } from '@angular/core';
import type { CreateLinkRequest, LinkPreviewResponse, LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINK_PREVIEW_DUPLICATE } from '@shelfmark/contracts/testing';
import { delay, type Observable, of, switchMap, throwError } from 'rxjs';
import { MOCK_HOST } from '../models/mock-host.const';
import { MOCK_LATENCY_MS } from '../models/mock-latency.const';
import type { LinksApi } from '../models/links-api.interface';
import { normalizeUrl } from './normalize-url';

/**
 * `LinksApi` over the contract fixtures with simulated latency, until the real API (#72).
 * `angular.dev/overview` answers with the duplicate fixture, `unreachable.example` fails the
 * preview and `save-fails.example` fails the save; every other URL gets a generated preview.
 */
@Service()
export class MockLinksApi implements LinksApi {
  preview(url: string): Observable<LinkPreviewResponse> {
    const host = hostOf(url);
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
    };
    return of(response).pipe(delay(MOCK_LATENCY_MS.Preview));
  }

  create(request: CreateLinkRequest): Observable<LinkResponse> {
    return of(request).pipe(
      delay(MOCK_LATENCY_MS.Create),
      switchMap((body) => {
        if (hostOf(body.url) === MOCK_HOST.SaveFails) {
          return throwError(() => new Error('Mock: save failed'));
        }
        const now = new Date().toISOString();
        const link: LinkResponse = {
          id: globalThis.crypto.randomUUID(),
          folderId: body.folderId ?? null,
          url: body.url,
          title: body.title ?? body.url,
          note: body.note ?? null,
          faviconUrl: null,
          imageUrl: null,
          isFavorite: false,
          lastOpenedAt: null,
          tags: body.tags ?? [],
          createdAt: now,
          updatedAt: now,
        };
        return of(link);
      }),
    );
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
