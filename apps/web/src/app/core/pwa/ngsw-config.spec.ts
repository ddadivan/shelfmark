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
});
