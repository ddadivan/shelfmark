import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  AI_ENDPOINT,
  type AskConversationListResponse,
  type AskConversationResponse,
  type AskConversationsDeletedResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { AskHistoryApi } from '../models/ask-history-api.interface';

/** `AskHistoryApi` over the REST API. The list shows its own failure; a delete keeps the toast. */
@Service()
export class HttpAskHistoryApi implements AskHistoryApi {
  private readonly http = inject(HttpClient);

  list(cursor?: string): Observable<AskConversationListResponse> {
    return this.http.get<AskConversationListResponse>(AI_ENDPOINT.AskConversations, {
      params: cursor === undefined ? {} : { cursor },
      context: skipErrorToast(),
    });
  }

  get(id: string): Observable<AskConversationResponse> {
    return this.http.get<AskConversationResponse>(this.one(id), { context: skipErrorToast() });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.one(id));
  }

  clear(): Observable<AskConversationsDeletedResponse> {
    return this.http.delete<AskConversationsDeletedResponse>(AI_ENDPOINT.AskConversations);
  }

  private one(id: string): string {
    return AI_ENDPOINT.AskConversation.replace(':id', encodeURIComponent(id));
  }
}
