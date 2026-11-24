import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AskConversationListResponse,
  AskConversationResponse,
  AskConversationsDeletedResponse,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { AskHistoryApi } from '../models/ask-history-api.interface';
import { MockAskHistory } from './mock-ask-history';

const notFound = (): HttpErrorResponse =>
  new HttpErrorResponse({ status: HttpStatusCode.NotFound, statusText: 'Not Found' });

/** `AskHistoryApi` over `MockAskHistory` (mock builds): unknown ids answer 404. */
@Service()
export class MockAskHistoryApi implements AskHistoryApi {
  private readonly history = inject(MockAskHistory);

  list(cursor?: string): Observable<AskConversationListResponse> {
    return defer(() => of(this.history.list(cursor))).pipe(delay(MOCK_LATENCY_MS.List));
  }

  get(id: string): Observable<AskConversationResponse> {
    return defer(() => {
      const conversation = this.history.get(id);
      return conversation === null ? throwError(notFound) : of(conversation);
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  remove(id: string): Observable<void> {
    return defer(() => (this.history.remove(id) ? of(undefined) : throwError(notFound))).pipe(
      delay(MOCK_LATENCY_MS.Create),
    );
  }

  clear(): Observable<AskConversationsDeletedResponse> {
    return defer(() => of({ deleted: this.history.clear() })).pipe(delay(MOCK_LATENCY_MS.Create));
  }
}
