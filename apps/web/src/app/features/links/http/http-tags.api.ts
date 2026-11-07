import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  CreateTagRequest,
  ListTagsResponse,
  MergeTagRequest,
  MergeTagResponse,
  TagResponse,
  UpdateTagRequest,
} from '@shelfmark/contracts';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import type { TagsApi } from '../models/tags-api.interface';

/**
 * `TagsApi` over `/api/tags`. Not registered yet: `provideLinksApi()` binds the placeholder
 * until the API is on main (then this class replaces it behind `TAGS_API`).
 */
@Service()
export class HttpTagsApi implements TagsApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<readonly TagResponse[]> {
    return this.http.get<ListTagsResponse>(this.url()).pipe(map((response) => response.items));
  }

  create(request: CreateTagRequest): Observable<TagResponse> {
    return this.http.post<TagResponse>(this.url(), request);
  }

  update(id: string, request: UpdateTagRequest): Observable<TagResponse> {
    return this.http.patch<TagResponse>(this.url(id), request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.url(id));
  }

  merge(id: string, targetTagId: string): Observable<MergeTagResponse> {
    const body: MergeTagRequest = { targetTagId };
    return this.http.post<MergeTagResponse>(`${this.url(id)}/merge`, body);
  }

  private url(id?: string): string {
    return id === undefined ? `${this.base}/tags` : `${this.base}/tags/${encodeURIComponent(id)}`;
  }
}
