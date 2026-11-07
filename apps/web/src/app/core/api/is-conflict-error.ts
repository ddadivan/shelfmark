import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

/** The request was refused with 409 (a duplicate name). */
export function isConflictError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict;
}
