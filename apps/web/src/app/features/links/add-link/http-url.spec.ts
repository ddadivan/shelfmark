import { displayHost, urlWithoutScheme } from './http-url';

describe('http-url', () => {
  it('shows the host without www', () => {
    expect(displayHost('https://www.cos.com/en/wool-coat')).toBe('cos.com');
    expect(displayHost('not a url')).toBe('not a url');
  });

  it('drops the scheme and a trailing slash for the fallback title', () => {
    expect(urlWithoutScheme('https://intranet.example/doc/42')).toBe('intranet.example/doc/42');
    expect(urlWithoutScheme('http://example.com/')).toBe('example.com');
  });
});
