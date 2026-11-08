import { AUTH_PROVIDER } from '@shelfmark/contracts';

/**
 * The only requests under `/api/auth` that reach Better Auth (`authAllowListMiddleware`). Paths are
 * canonical and matched case-sensitively against the raw request path: no trailing slash, no
 * double slash, no percent-encoding. A new Better Auth route stays unreachable until it is added
 * here on purpose.
 */
export const ALLOWED_AUTH_ROUTES: readonly { method: string; path: RegExp }[] = [
  { method: 'POST', path: /^\/api\/auth\/sign-in\/social$/ },
  {
    method: 'GET',
    path: new RegExp(`^/api/auth/callback/(?:${Object.values(AUTH_PROVIDER).join('|')})$`),
  },
  { method: 'GET', path: /^\/api\/auth\/get-session$/ },
  { method: 'POST', path: /^\/api\/auth\/sign-out$/ },
];
