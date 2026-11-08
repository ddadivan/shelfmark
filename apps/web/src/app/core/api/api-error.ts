import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '@shelfmark/contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMessage(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item): item is string => typeof item === 'string'))
  );
}

/** The API error body (`ApiError`) of a failed request, or `null` for any other failure. */
export function apiError(error: unknown): ApiError | null {
  if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) {
    return null;
  }
  const { statusCode, error: name, message, requestId } = error.error;
  if (
    typeof statusCode !== 'number' ||
    typeof name !== 'string' ||
    !isMessage(message) ||
    typeof requestId !== 'string'
  ) {
    return null;
  }
  return { statusCode, error: name, message, requestId };
}

/** True when the failed request carries the API error `message` (one of the contract constants). */
export function hasApiMessage(error: unknown, message: string): boolean {
  const body = apiError(error);
  if (body === null) {
    return false;
  }
  return Array.isArray(body.message) ? body.message.includes(message) : body.message === message;
}
