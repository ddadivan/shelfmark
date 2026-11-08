import { HttpContext } from '@angular/common/http';
import { SKIP_ERROR_TOAST } from './models/skip-error-toast.const';

/** `HttpClient` request context for callers that handle a 429 / 5xx themselves (no global toast). */
export function skipErrorToast(): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST, true);
}
