import { loggedPath } from './logged-path';

describe('loggedPath', () => {
  it('uses the route pattern when a route matched', () => {
    expect(
      loggedPath({ baseUrl: '/api', path: '/api/links/42', route: { path: '/links/:id' } }),
    ).toBe('/api/links/:id');
  });

  it('falls back to the raw path without a route', () => {
    expect(loggedPath({ baseUrl: '', path: '/api/nope', route: undefined })).toBe('/api/nope');
  });

  it('replaces the share token in the raw path', () => {
    expect(
      loggedPath({
        baseUrl: '',
        path: '/api/public/collections/tok_1-a/links/x',
        route: undefined,
      }),
    ).toBe('/api/public/collections/:token/links/x');
  });
});
