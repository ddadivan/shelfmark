import { HttpErrorResponse } from '@angular/common/http';

const STATUS_TEXT: Readonly<Record<number, string>> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
};

/**
 * The failure a mock API answers with, shaped like the real API's `ApiError` body, so the web
 * reads `status` and `message` exactly as it does from `HttpClient`. A contract message
 * (`FOLDER_ERROR_MESSAGE.NotFound`, ...) is a string; a validation failure lists its problems.
 */
export function mockHttpError(status: number, message?: string | string[]): HttpErrorResponse {
  const statusText = STATUS_TEXT[status] ?? 'Error';
  return new HttpErrorResponse({
    status,
    statusText,
    error: {
      statusCode: status,
      error: statusText,
      message: message ?? statusText,
      requestId: 'mock',
    },
  });
}
