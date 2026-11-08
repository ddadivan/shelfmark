import { AUTH_PROVIDER } from '@shelfmark/contracts';
import { providerRedirectUrl } from './provider-redirect-url';

const ORIGIN = 'https://shelfmark.example';
const GOOGLE = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=y';
const GITHUB = 'https://github.com/login/oauth/authorize?client_id=x';

describe('providerRedirectUrl', () => {
  it('accepts the authorize URL on the provider host', () => {
    expect(providerRedirectUrl(GOOGLE, AUTH_PROVIDER.Google, ORIGIN)).toBe(GOOGLE);
    expect(providerRedirectUrl(GITHUB, AUTH_PROVIDER.GitHub, ORIGIN)).toBe(GITHUB);
  });

  it('accepts a URL on this origin', () => {
    const url = `${ORIGIN}/sign-in?error=x`;

    expect(providerRedirectUrl(url, AUTH_PROVIDER.Google, ORIGIN)).toBe(url);
  });

  it.each([
    ['another provider host', GITHUB, AUTH_PROVIDER.Google],
    ['plain http', 'http://accounts.google.com/o/oauth2/v2/auth', AUTH_PROVIDER.Google],
    ['a look-alike host', 'https://accounts.google.com.evil.example/', AUTH_PROVIDER.Google],
    ['a subdomain', 'https://evil.github.com/login', AUTH_PROVIDER.GitHub],
    ['credentials in front of the host', 'https://github.com@evil.example/', AUTH_PROVIDER.GitHub],
    ['a custom port', 'https://github.com:8443/login', AUTH_PROVIDER.GitHub],
    ['a javascript URL', 'javascript:alert(1)', AUTH_PROVIDER.GitHub],
    ['a relative URL', '/login', AUTH_PROVIDER.GitHub],
    ['an arbitrary origin', 'https://evil.example/', AUTH_PROVIDER.GitHub],
  ])('rejects %s', (_name, url, provider) => {
    expect(providerRedirectUrl(url, provider, ORIGIN)).toBeNull();
  });

  it.each([undefined, null, 42, {}])('rejects a non-string (%s)', (value) => {
    expect(providerRedirectUrl(value, AUTH_PROVIDER.Google, ORIGIN)).toBeNull();
  });
});
