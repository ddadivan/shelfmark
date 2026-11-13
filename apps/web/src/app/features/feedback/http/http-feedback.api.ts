import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  FEEDBACK_ENDPOINT,
  feedbackScreenshotsPath,
  type FeedbackMessage,
  type FeedbackScreenshotUpload,
  type ListFeedbackMessagesResponse,
  type SendFeedbackRequest,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { skipErrorToast } from '../../../core/api/skip-error-toast';
import { FeedbackSendError } from '../utils/feedback-send-error';
import type { FeedbackApi } from '../models/feedback-api.interface';
import { FEEDBACK_SEND_ERROR_REASON } from '../models/feedback-send-error-reason.const';

/**
 * `FeedbackApi` over `GET` and `POST /api/feedback/messages` and the screenshot route. The
 * contract paths already carry the `/api` prefix, so `API_BASE_URL` is not added. Every call skips
 * the global error toast: the page and the dialog show their own states. A 429 becomes
 * `FeedbackSendError(RateLimited)`, any other failure of the send `FeedbackSendError(Failed)`; a
 * failed screenshot rejects with the `HttpErrorResponse` as is.
 */
@Service()
export class HttpFeedbackApi implements FeedbackApi {
  private readonly http = inject(HttpClient);

  async list(): Promise<FeedbackMessage[]> {
    const response = await firstValueFrom(
      this.http.get<ListFeedbackMessagesResponse>(FEEDBACK_ENDPOINT.Messages, {
        context: skipErrorToast(),
      }),
    );
    return response.items;
  }

  async send(request: SendFeedbackRequest): Promise<FeedbackMessage> {
    try {
      return await firstValueFrom(
        this.http.post<FeedbackMessage>(FEEDBACK_ENDPOINT.Messages, request, {
          context: skipErrorToast(),
        }),
      );
    } catch (error) {
      const rateLimited =
        error instanceof HttpErrorResponse && error.status === HttpStatusCode.TooManyRequests;
      throw new FeedbackSendError(
        rateLimited ? FEEDBACK_SEND_ERROR_REASON.RateLimited : FEEDBACK_SEND_ERROR_REASON.Failed,
      );
    }
  }

  attachScreenshot(id: string, upload: FeedbackScreenshotUpload): Promise<FeedbackMessage> {
    return firstValueFrom(
      this.http.post<FeedbackMessage>(feedbackScreenshotsPath(id), upload, {
        context: skipErrorToast(),
      }),
    );
  }
}
