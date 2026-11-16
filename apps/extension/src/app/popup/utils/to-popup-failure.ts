import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { LINK_ERROR_MESSAGE } from '@shelfmark/contracts';
import { POPUP_ERROR } from '../models/popup-error.const';
import type { PopupFailure } from '../models/popup-failure.interface';
import type { PopupStep } from '../models/popup-step.type';

function messageOf(error: HttpErrorResponse): string {
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null || !('message' in body)) return '';
  const { message } = body;
  return typeof message === 'string' ? message : '';
}

/**
 * What a failed request means for the popup: `'signedOut'` for a 401, else the error line to show.
 * A full library (the per-user or demo cap) cannot be fixed by trying again.
 */
export function toPopupFailure(error: unknown, step: PopupStep): PopupFailure | 'signedOut' {
  if (!(error instanceof HttpErrorResponse)) {
    return { error: POPUP_ERROR.Server, step, retryable: true };
  }
  if (error.status === HttpStatusCode.Unauthorized) return 'signedOut';
  if (error.status === 0) return { error: POPUP_ERROR.Offline, step, retryable: true };
  if (error.status === HttpStatusCode.TooManyRequests) {
    return { error: POPUP_ERROR.RateLimit, step, retryable: true };
  }
  const message = messageOf(error);
  if (message.startsWith(LINK_ERROR_MESSAGE.DemoLimitReached)) {
    return { error: POPUP_ERROR.DemoLimit, step, retryable: false };
  }
  if (message.startsWith(LINK_ERROR_MESSAGE.LimitReached)) {
    return { error: POPUP_ERROR.Limit, step, retryable: false };
  }
  return { error: POPUP_ERROR.Server, step, retryable: true };
}
