import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MonitoringErrorHandler } from './monitoring-error-handler';
import { MonitoringService } from './monitoring.service';
import { provideMonitoring } from './provide-monitoring';
import { SENTRY_LOADER } from './sentry-loader.token';
import type { SentryLoader } from './models/sentry-loader.type';
import { MAX_PENDING_ERRORS } from './models/max-pending-errors.const';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('MonitoringService', () => {
  const reporter = vi.fn();
  const loader = vi.fn<SentryLoader>();
  const fetchMock = vi.fn();

  beforeEach(() => {
    reporter.mockReset();
    loader.mockReset().mockResolvedValue(reporter);
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [{ provide: SENTRY_LOADER, useValue: loader }] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads nothing and sends nothing without a DSN', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ dsn: null, environment: 'x', release: null }));
    const service = TestBed.inject(MonitoringService);
    service.report(new Error('early'));
    await service.start();
    service.report(new Error('late'));
    expect(loader).not.toHaveBeenCalled();
    expect(reporter).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/monitoring/config',
      expect.objectContaining({ credentials: 'omit' }),
    );
  });

  it.each([
    ['a failing request', () => fetchMock.mockRejectedValue(new Error('offline'))],
    ['an error status', () => fetchMock.mockResolvedValue(jsonResponse({}, 502))],
    ['an invalid body', () => fetchMock.mockResolvedValue(jsonResponse({ dsn: 5 }))],
    ['a non-object body', () => fetchMock.mockResolvedValue(jsonResponse('text'))],
  ])('stays disabled and does not throw on %s', async (_label, arrange) => {
    arrange();
    const service = TestBed.inject(MonitoringService);
    await expect(service.start()).resolves.toBeUndefined();
    service.report(new Error('x'));
    expect(loader).not.toHaveBeenCalled();
    expect(reporter).not.toHaveBeenCalled();
  });

  it('loads the SDK with the DSN and flushes errors raised while loading', async () => {
    const config = {
      dsn: 'https://k@o1.ingest.sentry.io/2',
      environment: 'preview',
      release: 'r1',
    };
    fetchMock.mockResolvedValue(jsonResponse(config));
    const service = TestBed.inject(MonitoringService);
    const early = new Error('early');
    service.report(early);
    await service.start();
    expect(loader).toHaveBeenCalledWith(config, '/api/monitoring/tunnel');
    expect(reporter).toHaveBeenCalledWith(early);

    const late = new Error('late');
    service.report(late);
    expect(reporter).toHaveBeenLastCalledWith(late);
  });

  it('starts only once and caps the queue of early errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ dsn: 'https://k@o1.ingest.sentry.io/2', environment: 'p', release: null }),
    );
    const service = TestBed.inject(MonitoringService);
    for (let i = 0; i < MAX_PENDING_ERRORS + 5; i++) service.report(new Error(`e${i}`));
    await service.start();
    await service.start();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reporter).toHaveBeenCalledTimes(MAX_PENDING_ERRORS);
  });
});

describe('MonitoringErrorHandler', () => {
  it('is the app ErrorHandler, logs the error and forwards it to monitoring', () => {
    TestBed.configureTestingModule({ providers: [provideMonitoring()] });
    const handler = TestBed.inject(ErrorHandler);
    expect(handler).toBeInstanceOf(MonitoringErrorHandler);

    const report = vi.spyOn(TestBed.inject(MonitoringService), 'report');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('boom');
    handler.handleError(failure);
    expect(report).toHaveBeenCalledWith(failure);
    expect(log).toHaveBeenCalledWith(failure);
    log.mockRestore();
  });
});
