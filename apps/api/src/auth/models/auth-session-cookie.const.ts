/**
 * Session cookie facts shared by `createAuth` (which sets them) and the hand-built fallback that
 * expires the cookie (`SessionCookieService`), so the two cannot drift apart. The full name is
 * `[__Secure-]<AUTH_COOKIE_PREFIX>.<Name>`; `__Secure-` and `Secure` apply exactly in production.
 */
export const AUTH_SESSION_COOKIE = {
  Name: 'session_token',
  SecurePrefix: '__Secure-',
  Path: '/',
  SameSite: 'lax',
  HttpOnly: true,
} as const;

/** Header that carries cookies in a response. */
export const SET_COOKIE_HEADER = 'Set-Cookie';
