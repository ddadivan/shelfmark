/** Better Auth routes the web calls. Everything else under `/api/auth` is disabled. */
export const AUTH_ENDPOINT = {
  SignInSocial: '/api/auth/sign-in/social',
  GetSession: '/api/auth/get-session',
  SignOut: '/api/auth/sign-out',
} as const;
