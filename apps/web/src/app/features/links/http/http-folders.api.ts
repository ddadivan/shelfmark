import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  CreateFolderRequest,
  DeleteFolderQuery,
  FolderDeleteMode,
  FolderResponse,
  ListFoldersResponse,
  UpdateFolderRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { FoldersApi } from '../models/folders-api.interface';

/**
 * `FoldersApi` over `/api/folders`. Not registered yet: `provideLinksApi()` binds the
 * placeholder until the API is on main (then this class replaces it behind `FOLDERS_API`).
 */
@Service()
export class HttpFoldersApi implements FoldersApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  list(): Observable<ListFoldersResponse> {
    return this.http.get<ListFoldersResponse>(this.url());
  }

  create(request: CreateFolderRequest): Observable<FolderResponse> {
    return this.http.post<FolderResponse>(this.url(), request, { context: skipErrorToast() });
  }

  update(id: string, request: UpdateFolderRequest): Observable<FolderResponse> {
    return this.http.patch<FolderResponse>(this.url(id), request, { context: skipErrorToast() });
  }

  remove(id: string, mode: FolderDeleteMode): Observable<void> {
    const query: DeleteFolderQuery = { mode };
    return this.http.delete<void>(this.url(id), {
      params: new HttpParams({ fromObject: { ...query } }),
      context: skipErrorToast(),
    });
  }

  private url(id?: string): string {
    return id === undefined
      ? `${this.base}/folders`
      : `${this.base}/folders/${encodeURIComponent(id)}`;
  }
}
