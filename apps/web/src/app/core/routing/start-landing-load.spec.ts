import { startLandingLoad } from './start-landing-load';

describe('startLandingLoad', () => {
  it.each(['/', '/about', '/about/'])('starts the landing chunk on %s', (pathname) => {
    const load = vi.fn(() => Promise.resolve({}));

    startLandingLoad({ pathname }, load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it.each(['/links', '/sign-in', '/privacy', '/c/token', '/settings/account'])(
    'leaves %s alone',
    (pathname) => {
      const load = vi.fn(() => Promise.resolve({}));

      startLandingLoad({ pathname }, load);

      expect(load).not.toHaveBeenCalled();
    },
  );

  it('ignores a chunk that fails to load', async () => {
    const load = vi.fn(() => Promise.reject(new Error('offline')));

    expect(() => startLandingLoad({ pathname: '/' }, load)).not.toThrow();
    await Promise.resolve();
  });
});
