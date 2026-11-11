import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  PIN_ENDPOINT,
  type CreatePinRequest,
  type ListPinsResponse,
  type PinRef,
  type ReorderPinsRequest,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { PinsApi } from '../models/pins-api.interface';

/** `PinsApi` over `/api/pins`. Writes skip the global error toast: the caller says what failed. */
@Service()
export class HttpPinsApi implements PinsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<ListPinsResponse> {
    return this.http.get<ListPinsResponse>(PIN_ENDPOINT, { context: skipErrorToast() });
  }

  create(ref: PinRef): Observable<ListPinsResponse> {
    const body: CreatePinRequest = { kind: ref.kind, id: ref.id };
    return this.http.post<ListPinsResponse>(PIN_ENDPOINT, body, { context: skipErrorToast() });
  }

  remove(ref: PinRef): Observable<void> {
    return this.http.delete<void>(
      `${PIN_ENDPOINT}/${encodeURIComponent(ref.kind)}/${encodeURIComponent(ref.id)}`,
      { context: skipErrorToast() },
    );
  }

  reorder(refs: readonly PinRef[]): Observable<ListPinsResponse> {
    const body: ReorderPinsRequest = { items: refs.map(({ kind, id }) => ({ kind, id })) };
    return this.http.put<ListPinsResponse>(`${PIN_ENDPOINT}/order`, body, {
      context: skipErrorToast(),
    });
  }
}
