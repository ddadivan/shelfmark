import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  FolderShareResponse,
  PublicCollectionQuery,
  PublicCollectionResponse,
  UpdateFolderShareRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api/api-base-url';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { SharesApi } from '../models/shares-api.interface';

/** `SharesApi` over `/api/folders/:id/share` and `/api/public/collections/:token`. */
@Service()
export class HttpSharesApi implements SharesApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  get(folderId: string): Observable<FolderShareResponse> {
    return this.http.get<FolderShareResponse>(this.url(folderId), { context: skipErrorToast() });
  }

  enable(folderId: string): Observable<FolderShareResponse> {
    return this.http.post<FolderShareResponse>(this.url(folderId), null, {
      context: skipErrorToast(),
    });
  }

  setShowNotes(folderId: string, showNotes: boolean): Observable<FolderShareResponse> {
    const body: UpdateFolderShareRequest = { showNotes };
    return this.http.patch<FolderShareResponse>(this.url(folderId), body, {
      context: skipErrorToast(),
    });
  }

  reset(folderId: string): Observable<FolderShareResponse> {
    return this.http.post<FolderShareResponse>(`${this.url(folderId)}/reset`, null, {
      context: skipErrorToast(),
    });
  }

  disable(folderId: string): Observable<void> {
    return this.http.delete<void>(this.url(folderId), { context: skipErrorToast() });
  }

  collection(token: string, query: PublicCollectionQuery): Observable<PublicCollectionResponse> {
    let params = new HttpParams();
    if (query.folder !== undefined) params = params.set('folder', query.folder);
    if (query.page !== undefined) params = params.set('page', String(query.page));
    return this.http.get<PublicCollectionResponse>(
      `${this.base}/public/collections/${encodeURIComponent(token)}`,
      { params, context: skipErrorToast() },
    );
  }

  private url(folderId: string): string {
    return `${this.base}/folders/${encodeURIComponent(folderId)}/share`;
  }
}
