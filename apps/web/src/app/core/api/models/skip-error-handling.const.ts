import { HttpContextToken } from '@angular/common/http';

/** Set to `true` on a request to opt out of the global error handling (the 401 redirect). */
export const SKIP_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);
