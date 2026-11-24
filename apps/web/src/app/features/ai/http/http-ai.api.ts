import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  AI_ENDPOINT,
  type AiBackfillStatus,
  type AiJobResponse,
  type AiSettingsResponse,
  type AiTickResponse,
  type AskEvent,
  type AskTurn,
  type CreateAiDraftRequest,
  type LinkAiState,
  type LinkResponse,
  type MeaningSearchResponse,
  type RelatedLinksResponse,
  type TidyApplyRequest,
  type TidyApplyResponse,
  type TidyCountResponse,
  type TidyListResponse,
  type TidyUndoRequest,
  type TidyUndoResponse,
  type UndoAiApplyRequest,
  type UpdateAiSettingsRequest,
  VIEW_DRAFT_ENDPOINT,
  type ViewDraftResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { AiApi } from '../models/ai-api.interface';
import { fetchAskEvents } from './fetch-ask-events';

/** `path` with its `:id` replaced by the encoded `id`. */
function withId(path: string, id: string): string {
  return path.replace(':id', encodeURIComponent(id));
}

/** The query of a Tidy read: only the parts that are set. */
function tidyParams(parts: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(parts).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

/**
 * `AiApi` over `AI_ENDPOINT`. Every call skips the global error toast: AI never blocks a save, so
 * the caller decides what (if anything) a failure shows.
 */
@Service()
export class HttpAiApi implements AiApi {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<AiSettingsResponse> {
    return this.http.get<AiSettingsResponse>(AI_ENDPOINT.Settings, { context: skipErrorToast() });
  }

  updateSettings(request: UpdateAiSettingsRequest): Observable<AiSettingsResponse> {
    return this.http.patch<AiSettingsResponse>(AI_ENDPOINT.Settings, request, {
      context: skipErrorToast(),
    });
  }

  createDraft(request: CreateAiDraftRequest): Observable<AiJobResponse> {
    return this.http.post<AiJobResponse>(AI_ENDPOINT.Drafts, request, {
      context: skipErrorToast(),
    });
  }

  getJob(id: string): Observable<AiJobResponse> {
    return this.http.get<AiJobResponse>(withId(AI_ENDPOINT.Job, id), {
      context: skipErrorToast(),
    });
  }

  dismissSuggestion(id: string): Observable<void> {
    return this.http.post<void>(withId(AI_ENDPOINT.DismissSuggestion, id), null, {
      context: skipErrorToast(),
    });
  }

  getBackfill(): Observable<AiBackfillStatus> {
    return this.http.get<AiBackfillStatus>(AI_ENDPOINT.Backfill, { context: skipErrorToast() });
  }

  startBackfill(): Observable<AiBackfillStatus> {
    return this.http.post<AiBackfillStatus>(AI_ENDPOINT.Backfill, null, {
      context: skipErrorToast(),
    });
  }

  stopBackfill(): Observable<AiBackfillStatus> {
    return this.http.delete<AiBackfillStatus>(AI_ENDPOINT.Backfill, {
      context: skipErrorToast(),
    });
  }

  tick(): Observable<AiTickResponse> {
    return this.http.post<AiTickResponse>(AI_ENDPOINT.Tick, null, { context: skipErrorToast() });
  }

  deleteData(): Observable<void> {
    return this.http.delete<void>(AI_ENDPOINT.Data, { context: skipErrorToast() });
  }

  getTidy(after?: string, importId?: string): Observable<TidyListResponse> {
    return this.http.get<TidyListResponse>(AI_ENDPOINT.Tidy, {
      context: skipErrorToast(),
      params: tidyParams({ after, import: importId }),
    });
  }

  getTidyCount(importId?: string): Observable<TidyCountResponse> {
    return this.http.get<TidyCountResponse>(AI_ENDPOINT.TidyCount, {
      context: skipErrorToast(),
      params: tidyParams({ import: importId }),
    });
  }

  applyTidy(request: TidyApplyRequest): Observable<TidyApplyResponse> {
    return this.http.post<TidyApplyResponse>(AI_ENDPOINT.TidyApply, request, {
      context: skipErrorToast(),
    });
  }

  undoTidy(request: TidyUndoRequest): Observable<TidyUndoResponse> {
    return this.http.post<TidyUndoResponse>(AI_ENDPOINT.TidyUndo, request, {
      context: skipErrorToast(),
    });
  }

  getLinkAi(linkId: string): Observable<LinkAiState> {
    return this.http.get<LinkAiState>(withId(AI_ENDPOINT.LinkAi, linkId), {
      context: skipErrorToast(),
    });
  }

  rewriteSummary(linkId: string): Observable<LinkAiState> {
    return this.http.post<LinkAiState>(withId(AI_ENDPOINT.LinkAiRewrite, linkId), null, {
      context: skipErrorToast(),
    });
  }

  undoApply(linkId: string, request: UndoAiApplyRequest): Observable<LinkResponse> {
    return this.http.post<LinkResponse>(withId(AI_ENDPOINT.LinkAiUndo, linkId), request, {
      context: skipErrorToast(),
    });
  }

  searchMeaning(q: string, limit?: number): Observable<MeaningSearchResponse> {
    return this.http.get<MeaningSearchResponse>(AI_ENDPOINT.MeaningSearch, {
      context: skipErrorToast(),
      params: limit === undefined ? { q } : { q, limit },
    });
  }

  related(linkId: string, limit?: number): Observable<RelatedLinksResponse> {
    return this.http.get<RelatedLinksResponse>(withId(AI_ENDPOINT.RelatedLinks, linkId), {
      context: skipErrorToast(),
      ...(limit !== undefined && { params: { limit } }),
    });
  }

  ask(
    question: string,
    history: readonly AskTurn[],
    conversationId?: string,
  ): Observable<AskEvent> {
    return fetchAskEvents(AI_ENDPOINT.Ask, {
      question,
      history: [...history],
      ...(conversationId === undefined ? {} : { conversationId }),
    });
  }

  draftView(phrase: string): Observable<ViewDraftResponse> {
    return this.http.post<ViewDraftResponse>(
      VIEW_DRAFT_ENDPOINT,
      { phrase },
      { context: skipErrorToast() },
    );
  }
}
