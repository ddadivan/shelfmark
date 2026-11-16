import type { HttpInterceptorFn } from '@angular/common/http';
import { SHELFMARK_ORIGIN } from '../config/shelfmark-origin.const';

/**
 * Sends the browser's Shelfmark session cookie, and only to the Shelfmark origin. The popup never
 * reads the cookie; the browser attaches it because the extension has host access to that origin.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  let origin: string;
  try {
    origin = new URL(req.url).origin;
  } catch {
    return next(req);
  }
  return next(origin === SHELFMARK_ORIGIN ? req.clone({ withCredentials: true }) : req);
};
