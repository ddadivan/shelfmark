import { HttpErrorResponse } from '@angular/common/http';
import { ContractError } from '@shelfmark/contract-tests';
import { FEEDBACK_SEND_ERROR_REASON } from '../../features/feedback/models/feedback-send-error-reason.const';
import { FeedbackSendError } from '../../features/feedback/utils/feedback-send-error';

const BAD_REQUEST = 400;
const TOO_MANY_REQUESTS = 429;

/** The single-string `message` of an API error body, or `null` (no body, a validation list). */
function codeOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const message: unknown = Reflect.get(body, 'message');
  return typeof message === 'string' ? message : null;
}

/**
 * What a mock API rejected with, as the `ContractError` the real API's answer becomes in runner B.
 * `HttpErrorResponse` carries status and body. `HttpFeedbackApi` hides the status of a failed send
 * behind a `FeedbackSendError` reason, so the mock's reason maps back to 429 or 400. Anything
 * else (a plain `Error`) has no status: status 0, which no scenario accepts.
 */
export function toContractError(error: unknown): ContractError {
  if (error instanceof HttpErrorResponse) {
    return new ContractError(error.status, codeOf(error.error));
  }
  if (error instanceof FeedbackSendError) {
    return new ContractError(
      error.reason === FEEDBACK_SEND_ERROR_REASON.RateLimited ? TOO_MANY_REQUESTS : BAD_REQUEST,
      null,
    );
  }
  return new ContractError(0, null, error instanceof Error ? error.message : String(error));
}
