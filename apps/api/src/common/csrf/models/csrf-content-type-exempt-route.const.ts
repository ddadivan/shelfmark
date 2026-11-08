import { MONITORING_TUNNEL_ROUTE } from '@shelfmark/contracts';

/**
 * The only route that may skip the "body must be application/json" check of `CsrfGuard`. Matched on
 * the exact method and path, nothing else. Sentry's fetch transport sends the envelope as
 * text/plain; the route only forwards it to Sentry and changes no user data. The Origin and
 * Sec-Fetch-Site checks still apply to it.
 */
export const CSRF_CONTENT_TYPE_EXEMPT_ROUTE = {
  method: 'POST',
  path: `/api${MONITORING_TUNNEL_ROUTE}`,
} as const;
