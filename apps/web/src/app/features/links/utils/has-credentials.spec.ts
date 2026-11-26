import { hasCredentials } from './has-credentials';

describe('hasCredentials', () => {
  it.each(['https://user:pw@example.com/', 'https://user@example.com/'])('true for %s', (url) => {
    expect(hasCredentials(url)).toBe(true);
  });

  it.each(['https://example.com/@x', 'not a url', ''])('false for %j', (url) => {
    expect(hasCredentials(url)).toBe(false);
  });
});
