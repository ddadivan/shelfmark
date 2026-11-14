import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';
import { loggedPath } from '../util/logged-path';
import { REQUEST_ID_LOCAL } from '../request-id/request-id.middleware';

/**
 * One line per handled request: method, path, status, duration and request id. Never bodies,
 * query strings, headers, cookies or user data. Guards run before interceptors, so requests
 * rejected by a guard (401, 429) are not logged here.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startedAt = performance.now();
    const log = (status: number): void => {
      const duration = Math.round(performance.now() - startedAt);
      const requestId = String(res.locals[REQUEST_ID_LOCAL] ?? '');
      this.logger.log(`${req.method} ${loggedPath(req)} ${status} ${duration}ms ${requestId}`);
    };
    return next.handle().pipe(
      tap({
        complete: () => log(res.statusCode),
        error: (error: unknown) =>
          log(
            error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
          ),
      }),
    );
  }
}
