import { randomUUID } from 'node:crypto';
import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  BadGatewayException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError } from '@shelfmark/contracts';
import type { Request, Response } from 'express';
import { reportException } from '../../monitoring/report-exception';
import { REQUEST_ID_LOCAL } from '../request-id/request-id.middleware';

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
  const status = readProperty(exception, 'status') ?? readProperty(exception, 'statusCode');
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
    private readonly report: (exception: unknown, requestId: string) => void = reportException,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    if (res.headersSent) return;

    const local: unknown = res.locals[REQUEST_ID_LOCAL];
    const requestId = typeof local === 'string' ? local : randomUUID();
    const { statusCode, error, message } = normalise(exception);

    // Method, path, status and request id only: never bodies, queries or headers.
    const line = `${req.method} ${req.path} ${statusCode} ${requestId}`;
    if (statusCode >= 500) {
      this.logger.error(line, exception instanceof Error ? exception.stack : String(exception));
      // Only server faults reach Sentry (client errors are noise). A failing Sentry tunnel is
      // not reported back to Sentry. Scrubbing happens in the SDK's beforeSend.
      if (!(exception instanceof BadGatewayException)) this.report(exception, requestId);
    } else {
      this.logger.warn(line);
    }

    const body: ApiError = { statusCode, error, message, requestId };
    res.status(statusCode).json(body);
  }
}
