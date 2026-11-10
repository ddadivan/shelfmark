import { HttpException, HttpStatus } from '@nestjs/common';
import { FEEDBACK_ERROR_MESSAGE } from './models/feedback-error-message.const';

/** 429 from the Postgres message limit; the controller turns `retryAfterSeconds` into `Retry-After`. */
export class FeedbackLimitExceededException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(FEEDBACK_ERROR_MESSAGE.MessageLimit, HttpStatus.TOO_MANY_REQUESTS);
  }
}
