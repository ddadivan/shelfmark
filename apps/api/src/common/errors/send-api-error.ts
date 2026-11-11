import { STATUS_CODES } from 'node:http';
import type { Response } from 'express';
import { REQUEST_ID_LOCAL } from '../request-id/request-id.middleware';

/** Answers from middleware (outside Nest's filters) in the `ApiError` shape. */
export function sendApiError(res: Response, statusCode: number, message?: string): void {
  const error = STATUS_CODES[statusCode] ?? 'Error';
  res.status(statusCode).json({
    statusCode,
    error,
    message: message ?? error,
    requestId: String(res.locals[REQUEST_ID_LOCAL] ?? ''),
  });
}
