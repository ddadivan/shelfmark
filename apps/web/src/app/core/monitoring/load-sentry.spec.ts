import * as sentry from '@sentry/browser';
import { loadSentry } from './load-sentry';
import { scrubEvent } from './scrub-event';

vi.mock('@sentry/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/browser')>()),
  init: vi.fn(),
  captureException: vi.fn(),
}));

describe('loadSentry', () => {
  it('starts the SDK through the same-origin tunnel with scrubbing and no extras', async () => {
    const report = await loadSentry({
      dsn: 'https://k@o1.ingest.sentry.io/2',
      environment: 'preview',
      release: 'r1',
    });
    const options = vi.mocked(sentry.init).mock.calls[0]?.[0];
    expect(options).toEqual(
      expect.objectContaining({
        dsn: 'https://k@o1.ingest.sentry.io/2',
        environment: 'preview',
        release: 'r1',
        tunnel: '/api/monitoring/tunnel',
        maxBreadcrumbs: 0,
        beforeSend: scrubEvent,
      }),
    );
    expect(options?.beforeBreadcrumb?.({ message: 'x' }, undefined)).toBeNull();
    expect(options).not.toHaveProperty('replaysSessionSampleRate');
    expect(options).not.toHaveProperty('tracesSampleRate');

    const failure = new Error('x');
    report(failure);
    expect(sentry.captureException).toHaveBeenCalledWith(failure);
  });

  it('omits the release when unknown', async () => {
    vi.mocked(sentry.init).mockClear();
    await loadSentry({ dsn: 'https://k@o1.ingest.sentry.io/2', environment: 'p', release: null });
    expect(vi.mocked(sentry.init).mock.calls[0]?.[0]).not.toHaveProperty('release');
  });
});
