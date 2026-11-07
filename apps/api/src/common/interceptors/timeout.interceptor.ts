import {
  type CallHandler,
  type ExecutionContext,
  GatewayTimeoutException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, type Observable, throwError, timeout, TimeoutError } from 'rxjs';
import { REQUEST_TIMEOUT_MS } from './models/request-timeout.const';

/**
 * Fails a handler that runs longer than `REQUEST_TIMEOUT_MS` with a 504; `AllExceptionsFilter`
 * renders it as a generic `ApiError`. Other errors pass through untouched. The timer does not
 * cancel the underlying work, it only stops waiting for it.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error: unknown) =>
        throwError(() => (error instanceof TimeoutError ? new GatewayTimeoutException() : error)),
      ),
    );
  }
}
