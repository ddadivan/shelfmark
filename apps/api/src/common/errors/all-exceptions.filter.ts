import { randomUUID } from 'node:crypto';
import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@shelfmark/contracts';
import type { Request, Response } from 'express';
import { TunnelUpstreamException } from '../../monitoring/tunnel-upstream.exception';
import { reportException } from '../../monitoring/report-exception';
import { REQUEST_ID_LOCAL } from '../request-id/request-id.middleware';
import { loggedPath } from '../util/logged-path';

type Normalised = Pick<ApiError, 'statusCode' | 'error' | 'message'>;

function readProperty(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}

function reasonPhrase(status: number): string {
  return STATUS_CODES[status] ?? 'Error';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === 'string');
}

function generic(statusCode: number): Normalised {
  return { statusCode, error: reasonPhrase(statusCode), message: reasonPhrase(statusCode) };
}

function fromHttpException(exception: HttpException): Normalised {
  const statusCode = exception.getStatus();
  // Internal messages never reach clients.
  if (statusCode >= 500) return generic(statusCode);

  const body = exception.getResponse();
  let message: string | string[] = exception.message;
  let error = reasonPhrase(statusCode);

  if (typeof body === 'string') {
    message = body;
  } else {
    const bodyMessage = readProperty(body, 'message');
    if (typeof bodyMessage === 'string' || isStringArray(bodyMessage)) message = bodyMessage;
    const bodyError = readProperty(body, 'error');
    if (typeof bodyError === 'string') error = bodyError;
  }
  return { statusCode, error, message };
}

function normalise(exception: unknown): Normalised {
  if (exception instanceof HttpException) return fromHttpException(exception);

  switch (readProperty(exception, 'type')) {
    case 'entity.parse.failed':
      return { statusCode: 400, error: reasonPhrase(400), message: 'Malformed JSON body' };
    case 'entity.too.large':
      return { statusCode: 413, error: reasonPhrase(413), message: 'Request body is too large' };
  }

  // http-errors from body-parser (415 charset/encoding, request.aborted, ...).
  // Better Auth's APIError has a string `status` ('UNAUTHORIZED') and a numeric `statusCode`: use
  // whichever of the two is a number.
  const candidates = [readProperty(exception, 'status'), readProperty(exception, 'statusCode')];
  const status = candidates.find((value): value is number => typeof value === 'number');
  if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 499) {
    return generic(status);
  }
  return generic(HttpStatus.INTERNAL_SERVER_ERROR);
}

/** Turns every exception into the unified `ApiError` body. Never leaks stacks. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly report: (
      exception: unknown,
      requestId: string,
    ) => Promise<void> = reportException,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    if (res.headersSent) return;

    const local: unknown = res.locals[REQUEST_ID_LOCAL];
    const requestId = typeof local === 'string' ? local : randomUUID();
    const { statusCode, error, message } = normalise(exception);

    // Method, route pattern, status and request id only: never bodies, queries, headers or the
    // share token.
    const line = `${req.method} ${loggedPath(req)} ${statusCode} ${requestId}`;
    if (statusCode >= 500) {
      this.logger.error(line, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(line);
    }

    const body: ApiError = { statusCode, error, message, requestId };
    res.status(statusCode).json(body);

    // After the response is out: only server faults reach Sentry (client errors are noise), the
    // tunnel's own upstream failure is not reported back to Sentry, and delivery is awaited
    // (bounded) because the function may freeze once the response is sent. Scrubbing happens in
    // the SDK's beforeSend.
    if (statusCode >= 500 && !(exception instanceof TunnelUpstreamException)) {
      await this.report(exception, requestId);
    }
  }
}
