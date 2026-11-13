import { HttpException, HttpStatus } from '@nestjs/common';
import { FEEDBACK_ERROR_MESSAGE } from './models/feedback-error-message.const';

/**
 * 429 from a limit counted in Postgres (messages per hour, screenshot bytes per day); the
 * controller turns `retryAfterSeconds` into `Retry-After`.
 */
export class FeedbackLimitExceededException extends HttpException {
  constructor(
    readonly retryAfterSeconds: number,
    message: string = FEEDBACK_ERROR_MESSAGE.MessageLimit,
  ) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
