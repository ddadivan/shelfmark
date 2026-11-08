import { HttpException, HttpStatus } from '@nestjs/common';
import { DEMO_ERROR_MESSAGE } from './models/demo-error-message.const';

/** 429 from the Postgres quota; the controller turns `retryAfterSeconds` into `Retry-After`. */
export class DemoQuotaExceededException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(DEMO_ERROR_MESSAGE.QuotaExceeded, HttpStatus.TOO_MANY_REQUESTS);
  }
}
