import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  PIN_ERROR_MESSAGE,
  PIN_KIND,
  PIN_LIMIT,
  type ListPinsResponse,
  type PinRef,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { PinsApi } from '../models/pins-api.interface';

function failure(status: number, message: string): Observable<never> {
  return throwError(() => mockHttpError(status, message));
}

/**
 * `PinsApi` over the shared in-memory library, with simulated latency. Like the real API: a pin
 * is idempotent, goes to the end, needs a live folder or link (404) and is refused beyond
 * `PIN_LIMIT.Max` (409); a reorder must list exactly the pinned items (400).
 */
@Service()
export class MockPinsApi implements PinsApi {
  private readonly data = inject(MockLibraryData);

  list(): Observable<ListPinsResponse> {
    return defer(() => of(this.data.pinsView())).pipe(delay(MOCK_LATENCY_MS.List));
  }

  create(ref: PinRef): Observable<ListPinsResponse> {
    return defer(() => {
      if (!this.exists(ref)) {
        return failure(HttpStatusCode.NotFound, PIN_ERROR_MESSAGE.NotFound);
      }
      if (!this.data.isPinned(ref.kind, ref.id)) {
        if (this.data.pins.length >= PIN_LIMIT.Max) {
          return failure(HttpStatusCode.Conflict, PIN_ERROR_MESSAGE.LimitReached);
        }
        this.data.pins = [...this.data.pins, { kind: ref.kind, id: ref.id }];
      }
      return of(this.data.pinsView());
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  remove(ref: PinRef): Observable<void> {
    return defer(() => {
      if (!this.exists(ref)) {
        return failure(HttpStatusCode.NotFound, PIN_ERROR_MESSAGE.NotFound);
      }
      this.data.unpin(ref.kind, [ref.id]);
      return of(undefined);
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  reorder(refs: readonly PinRef[]): Observable<ListPinsResponse> {
    return defer(() => {
      const current = this.data.pins;
      const same =
        refs.length === current.length &&
        refs.every(
          (ref, index) =>
            current.some((pin) => pin.kind === ref.kind && pin.id === ref.id) &&
            refs.findIndex((other) => other.kind === ref.kind && other.id === ref.id) === index,
        );
      if (!same) {
        return failure(HttpStatusCode.BadRequest, PIN_ERROR_MESSAGE.OrderMismatch);
      }
      this.data.pins = refs.map(({ kind, id }) => ({ kind, id }));
      return of(this.data.pinsView());
    }).pipe(delay(MOCK_LATENCY_MS.Create));
  }

  private exists(ref: PinRef): boolean {
    return ref.kind === PIN_KIND.Folder
      ? this.data.folderList.some((folder) => folder.id === ref.id)
      : this.data.links.some((link) => link.id === ref.id);
  }
}
