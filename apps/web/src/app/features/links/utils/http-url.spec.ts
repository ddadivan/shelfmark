import { urlWithoutScheme } from './http-url';

describe('http-url', () => {
  it('drops the scheme and a trailing slash for the fallback title', () => {
    expect(urlWithoutScheme('https://intranet.example/doc/42')).toBe('intranet.example/doc/42');
    expect(urlWithoutScheme('http://example.com/')).toBe('example.com');
  });
});
