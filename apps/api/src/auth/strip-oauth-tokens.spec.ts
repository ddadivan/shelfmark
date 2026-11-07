import { OAUTH_TOKEN_STRIP, stripOAuthTokens } from './strip-oauth-tokens';

describe('stripOAuthTokens', () => {
  it('nulls every provider credential and expiry', async () => {
    const result = await stripOAuthTokens();
    expect(result.data).toEqual({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    });
    expect(result.data).toBe(OAUTH_TOKEN_STRIP);
  });
});
