import { displayHost, isHttpUrl, urlWithoutScheme } from './http-url';

describe('http-url', () => {
  it('accepts http and https URLs with a host', () => {
    expect(isHttpUrl('https://example.com/a?b=1')).toBe(true);
    expect(isHttpUrl('http://localhost:4200')).toBe(true);
  });

  it('rejects other schemes, bare text and an empty host', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('youtube com/ng22')).toBe(false);
    expect(isHttpUrl('https://')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });

  it('shows the host without www', () => {
    expect(displayHost('https://www.cos.com/en/wool-coat')).toBe('cos.com');
    expect(displayHost('not a url')).toBe('not a url');
  });

  it('drops the scheme and a trailing slash for the fallback title', () => {
    expect(urlWithoutScheme('https://intranet.example/doc/42')).toBe('intranet.example/doc/42');
    expect(urlWithoutScheme('http://example.com/')).toBe('example.com');
  });
});
