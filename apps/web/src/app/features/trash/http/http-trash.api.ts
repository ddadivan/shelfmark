import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  TRASH_ENDPOINT,
  type ListTrashResponse,
  type TrashActionResponse,
  type TrashItemRef,
  type TrashItemsRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { TrashApi } from '../models/trash-api.interface';

/** `TrashApi` over `/api/trash`. Writes skip the global error toast: the caller says what failed. */
@Service()
export class HttpTrashApi implements TrashApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ListTrashResponse> {
    return this.http.get<ListTrashResponse>(TRASH_ENDPOINT.Base);
  }

  restore(items: readonly TrashItemRef[]): Observable<TrashActionResponse> {
    const body: TrashItemsRequest = { items: [...items] };
    return this.http.post<TrashActionResponse>(TRASH_ENDPOINT.Restore, body, {
      context: skipErrorToast(),
    });
  }

  deleteForever(items: readonly TrashItemRef[]): Observable<TrashActionResponse> {
    const body: TrashItemsRequest = { items: [...items] };
    return this.http.post<TrashActionResponse>(TRASH_ENDPOINT.Delete, body, {
      context: skipErrorToast(),
    });
  }

  empty(): Observable<TrashActionResponse> {
    return this.http.delete<TrashActionResponse>(TRASH_ENDPOINT.Base, {
      context: skipErrorToast(),
    });
  }
}
