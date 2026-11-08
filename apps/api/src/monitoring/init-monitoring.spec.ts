import { init, isInitialized } from '@sentry/node';
import { initMonitoring } from './init-monitoring';
import { parseDsn } from './parse-dsn';
import { scrubEvent } from './scrub-event';

vi.mock('@sentry/node', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/node')>()),
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
}));

describe('initMonitoring', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing without a DSN', () => {
    expect(
      initMonitoring({ apiDsn: undefined, webDsn: undefined, environment: 'x', release: null }),
    ).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('starts the SDK with scrubbing, no PII and the release', () => {
    const apiDsn = parseDsn('https://k@o1.ingest.sentry.io/1');
    const started = initMonitoring({
      apiDsn,
      webDsn: undefined,
      environment: 'preview',
      release: 'abc',
    });
    expect(started).toBe(true);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://k@o1.ingest.sentry.io/1',
        environment: 'preview',
        release: 'abc',
        maxBreadcrumbs: 0,
        beforeSend: scrubEvent,
      }),
    );
  });

  it('starts the SDK only once per process', () => {
    const apiDsn = parseDsn('https://k@o1.ingest.sentry.io/1');
    vi.mocked(isInitialized).mockReturnValueOnce(true);
    const settings = { apiDsn, webDsn: undefined, environment: 'x', release: null };
    expect(initMonitoring(settings)).toBe(true);
    expect(init).not.toHaveBeenCalled();
  });

  it('omits the release when unknown and drops breadcrumbs', () => {
    const apiDsn = parseDsn('https://k@o1.ingest.sentry.io/1');
    initMonitoring({ apiDsn, webDsn: undefined, environment: 'preview', release: null });
    const options = vi.mocked(init).mock.calls[0]?.[0];
    expect(options).not.toHaveProperty('release');
    expect(options?.beforeBreadcrumb?.({ message: 'x' }, undefined)).toBeNull();
  });
});
