import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  FEEDBACK_ENDPOINT,
  type FeedbackMilestone,
  type FeedbackPromptResponse,
  type RecordFeedbackRequest,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import type { RatingApi } from '../models/rating-api.interface';

/**
 * `RatingApi` over `GET /api/feedback/prompt` and `POST /api/feedback`. The contract's
 * `FEEDBACK_ENDPOINT` already carries the `/api` prefix, so `API_BASE_URL` is not added. Both
 * calls skip the global error toast: the prompt is a background request that fails silently, and
 * the dialog handles a failed record itself.
 */
@Service()
export class HttpRatingApi implements RatingApi {
  private readonly http = inject(HttpClient);

  async prompt(): Promise<FeedbackMilestone | null> {
    const response = await firstValueFrom(
      this.http.get<FeedbackPromptResponse>(FEEDBACK_ENDPOINT.Prompt, {
        context: skipErrorToast(),
      }),
    );
    return response.milestone;
  }

  async record(request: RecordFeedbackRequest): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(FEEDBACK_ENDPOINT.Record, request, { context: skipErrorToast() }),
    );
  }
}
