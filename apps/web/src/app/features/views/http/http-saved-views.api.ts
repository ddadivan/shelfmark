import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  SAVED_VIEW_ENDPOINT,
  type CreateSavedViewRequest,
  type ListSavedViewsResponse,
  type ReorderSavedViewsRequest,
  type SavedViewResponse,
  type UpdateSavedViewRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { SavedViewsApi } from '../models/saved-views-api.interface';

/** `SavedViewsApi` over `/api/views`. Writes skip the global error toast: the caller says what failed. */
@Service()
export class HttpSavedViewsApi implements SavedViewsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ListSavedViewsResponse> {
    return this.http.get<ListSavedViewsResponse>(SAVED_VIEW_ENDPOINT, {
      context: skipErrorToast(),
    });
  }

  create(request: CreateSavedViewRequest): Observable<SavedViewResponse> {
    return this.http.post<SavedViewResponse>(SAVED_VIEW_ENDPOINT, request, {
      context: skipErrorToast(),
    });
  }

  update(id: string, request: UpdateSavedViewRequest): Observable<SavedViewResponse> {
    return this.http.patch<SavedViewResponse>(
      `${SAVED_VIEW_ENDPOINT}/${encodeURIComponent(id)}`,
      request,
      { context: skipErrorToast() },
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${SAVED_VIEW_ENDPOINT}/${encodeURIComponent(id)}`, {
      context: skipErrorToast(),
    });
  }

  reorder(ids: readonly string[]): Observable<ListSavedViewsResponse> {
    const body: ReorderSavedViewsRequest = { ids: [...ids] };
    return this.http.put<ListSavedViewsResponse>(`${SAVED_VIEW_ENDPOINT}/order`, body, {
      context: skipErrorToast(),
    });
  }
}
