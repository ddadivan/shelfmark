import { HttpContextToken } from '@angular/common/http';

/**
 * Request context flag: `true` means the caller shows its own message for a failed request, so
 * the error interceptor does not toast a 429 or 5xx for it. Set it through `skipErrorToast()`.
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
