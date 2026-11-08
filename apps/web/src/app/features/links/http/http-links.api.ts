import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  CreateLinkRequest,
  GetLinkResponse,
  LinkPreviewRequest,
  LinkPreviewResponse,
  LinkResponse,
  ListLinksQuery,
  ListLinksResponse,
  OpenLinkResponse,
  RecentLinksQuery,
  RecentLinksResponse,
  UpdateLinkRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import type { LinksApi } from '../models/links-api.interface';
import { skipErrorToast } from '../../../core/api/skip-error-toast';

/**
 * `LinksApi` over `/api/links`. `create` answers 201 for a new link and 200 when the
 * `idempotencyKey` replays an earlier request; both resolve with the link.
 */
@Service()
export class HttpLinksApi implements LinksApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  preview(url: string): Observable<LinkPreviewResponse> {
    const body: LinkPreviewRequest = { url };
    return this.http.post<LinkPreviewResponse>(`${this.url()}/preview`, body, {
      context: skipErrorToast(),
    });
  }

  create(request: CreateLinkRequest): Observable<LinkResponse> {
    return this.http.post<LinkResponse>(this.url(), request, { context: skipErrorToast() });
  }

  list(query: ListLinksQuery = {}): Observable<ListLinksResponse> {
    return this.http.get<ListLinksResponse>(this.url(), { params: listParams(query) });
  }

  recent(query: RecentLinksQuery = {}): Observable<RecentLinksResponse> {
    return this.http.get<RecentLinksResponse>(`${this.url()}/recent`, {
      params: query.limit === undefined ? undefined : new HttpParams().set('limit', query.limit),
    });
  }

  get(id: string): Observable<GetLinkResponse> {
    return this.http.get<GetLinkResponse>(this.url(id));
  }

  update(id: string, request: UpdateLinkRequest): Observable<LinkResponse> {
    return this.http.patch<LinkResponse>(this.url(id), request, { context: skipErrorToast() });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.url(id), { context: skipErrorToast() });
  }

  open(id: string): Observable<OpenLinkResponse> {
    return this.http.post<OpenLinkResponse>(
      `${this.url(id)}/open`,
      {},
      { context: skipErrorToast() },
    );
  }

  private url(id?: string): string {
    return id === undefined ? `${this.base}/links` : `${this.base}/links/${encodeURIComponent(id)}`;
  }
}

/** Query string of a list request: `tag` repeated, booleans as `true` / `false`, `undefined` omitted. */
function listParams(query: ListLinksQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params = params.append(key, item);
      }
    } else {
      params = params.append(key, String(value));
    }
  }
  return params;
}
