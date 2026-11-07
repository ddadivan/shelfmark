import ngswConfig from '../../../../ngsw-config.json';

// The service worker may cache the app shell and static assets only: API responses (user data,
// sessions) must never land in a shared cache.
describe('ngsw-config.json', () => {
  it('defines no data groups, so no request is cached by URL pattern', () => {
    expect('dataGroups' in ngswConfig).toBe(false);
  });

  it('lists no /api resource in any asset group', () => {
    const files = ngswConfig.assetGroups.flatMap((group) => group.resources.files);

    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((file) => /^\/api(\/|$)/.test(file))).toEqual([]);
  });

  it('excludes /api and everything below it from navigation fallback', () => {
    expect(ngswConfig.navigationUrls).toContain('!/api');
    expect(ngswConfig.navigationUrls).toContain('!/api/**');
  });

  it('fetches navigations from the network first so each document gets a fresh CSP nonce', () => {
    expect(ngswConfig.navigationRequestStrategy).toBe('freshness');
  });

  it('serves the shell from /index.html', () => {
    expect(ngswConfig.index).toBe('/index.html');
  });

  // The share target opens `/share?...` as a navigation: the worker matches the path without the
  // query, so it must fall back to the shell like any app route.
  it('serves /share from the shell: not excluded from navigation fallback', () => {
    const toRegExp = (glob: string) =>
      new RegExp(
        `^${glob
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*\*/g, '\u0000')
          .replace(/\*/g, '[^/]*')
          .replace(/\u0000/g, '.*')}$`,
      );
    const include = ngswConfig.navigationUrls.filter((url) => !url.startsWith('!')).map(toRegExp);
    const exclude = ngswConfig.navigationUrls
      .filter((url) => url.startsWith('!'))
      .map((url) => toRegExp(url.slice(1)));

    expect(include.some((re) => re.test('/share'))).toBe(true);
    expect(exclude.some((re) => re.test('/share'))).toBe(false);
  });
});
