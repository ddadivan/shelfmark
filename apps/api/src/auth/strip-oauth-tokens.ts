/**
 * `databaseHooks.account.*.before` hook data: nulls every provider credential Better Auth would
 * persist. Stage 1 never calls the provider APIs after sign-in, so access, refresh and ID tokens
 * are never stored (ADR 0027). The database only keeps who the account is, not what it can do.
 */
export const OAUTH_TOKEN_STRIP = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
} as const;

export function stripOAuthTokens(): Promise<{ data: typeof OAUTH_TOKEN_STRIP }> {
  return Promise.resolve({ data: OAUTH_TOKEN_STRIP });
}
