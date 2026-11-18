import {
  type CallHandler,
  type ExecutionContext,
  GatewayTimeoutException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, type Observable, throwError, timeout, TimeoutError } from 'rxjs';
import { LONG_RUNNING_METADATA_KEY } from './models/long-running-metadata-key.const';
import { REQUEST_TIMEOUT_MS } from './models/request-timeout.const';

/**
 * Fails a handler that runs longer than `REQUEST_TIMEOUT_MS` with a 504; `AllExceptionsFilter`
 * renders it as a generic `ApiError`. Other errors pass through untouched. The timer does not
 * cancel the underlying work, it only stops waiting for it. A handler marked `@LongRunning()` (only
 * the routes of `LONG_RUNNING_ROUTES`, spec-enforced) is skipped: it streams and keeps its own
 * deadlines, and a 504 cannot be sent once a stream has started (ADR 0051 point 2).
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.reflector.get<boolean>(LONG_RUNNING_METADATA_KEY, context.getHandler()) === true) {
      return next.handle();
    }
    return next.handle().pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error: unknown) =>
        throwError(() => (error instanceof TimeoutError ? new GatewayTimeoutException() : error)),
      ),
    );
  }
}
