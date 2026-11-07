import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../app/configure-app';
import { MAX_ENVELOPE_BYTES } from './models/max-envelope-bytes.const';
import type { MonitoringSettings } from './models/monitoring-settings.interface';
import { MONITORING_SETTINGS } from './models/monitoring-settings.token';
import { MonitoringModule } from './monitoring.module';
import { parseDsn } from './parse-dsn';

const WEB_DSN = 'https://webkey@o1.ingest.sentry.io/2';
const API_DSN = 'https://apikey@o1.ingest.sentry.io/1';
const UNCONFIGURED: MonitoringSettings = {
  apiDsn: undefined,
  webDsn: undefined,
  environment: 'x',
  release: null,
};

function envelope(dsn: string | undefined): string {
  return `${JSON.stringify(dsn === undefined ? {} : { dsn })}\n{"type":"event"}\n{"message":"x"}`;
}

async function buildApp(settings: MonitoringSettings): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [MonitoringModule] })
    .overrideProvider(MONITORING_SETTINGS)
    .useValue(settings)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configureApp(app, { isProduction: true });
  await app.init();
  return app;
}

describe('monitoring routes', () => {
  const configured: MonitoringSettings = {
    apiDsn: parseDsn(API_DSN),
    webDsn: parseDsn(WEB_DSN),
    environment: 'preview',
    release: 'abc123',
  };
  let app: NestExpressApplication;
  const fetchMock = vi.fn();

  beforeEach(async () => {
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    app = await buildApp(configured);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await app.close();
  });

  describe('GET /api/monitoring/config', () => {
    it('returns the web DSN, environment and release without a session', async () => {
      const res = await request(app.getHttpServer()).get('/api/monitoring/config').expect(200);
      expect(res.body).toEqual({ dsn: WEB_DSN, environment: 'preview', release: 'abc123' });
    });

    it('returns a null DSN when monitoring is not configured', async () => {
      await app.close();
      app = await buildApp(UNCONFIGURED);
      const res = await request(app.getHttpServer()).get('/api/monitoring/config').expect(200);
      expect(res.body).toEqual({ dsn: null, environment: 'x', release: null });
    });
  });

  describe('POST /api/monitoring/tunnel', () => {
    function post(body: string) {
      return request(app.getHttpServer())
        .post('/api/monitoring/tunnel')
        .set('Content-Type', 'text/plain;charset=UTF-8')
        .set('Cookie', 'session=secret')
        .send(body);
    }

    it('forwards an envelope for the web project to the configured ingest URL', async () => {
      await post(envelope(WEB_DSN)).expect(204);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://o1.ingest.sentry.io/api/2/envelope/');
      expect(init.method).toBe('POST');
      expect(JSON.stringify(init.headers)).not.toMatch(/cookie|authorization/i);
      expect(init.credentials).toBeUndefined();
      expect(init.redirect).toBe('error');
    });

    it('also accepts the API project DSN', async () => {
      await post(envelope(API_DSN)).expect(204);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('https://o1.ingest.sentry.io/api/1/envelope/');
    });

    it.each([
      ['another host', 'https://webkey@evil.example/2'],
      ['another project', 'https://webkey@o1.ingest.sentry.io/3'],
      ['another key', 'https://other@o1.ingest.sentry.io/2'],
      ['a host that only starts like ours', 'https://webkey@o1.ingest.sentry.io.evil.example/2'],
      ['a malformed DSN', 'nonsense'],
    ])('rejects an envelope with %s and sends nothing', async (_label, dsn) => {
      await post(envelope(dsn)).expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an envelope without a DSN or with a broken header', async () => {
      await post(envelope(undefined)).expect(400);
      await post('not json\n{}').expect(400);
      await post('').expect(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects an oversized envelope', async () => {
      await post(`${envelope(WEB_DSN)}\n${'a'.repeat(MAX_ENVELOPE_BYTES)}`).expect(413);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('answers 502 when Sentry fails or is unreachable', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
      await post(envelope(WEB_DSN)).expect(502);
      fetchMock.mockRejectedValueOnce(new Error('network'));
      const res = await post(envelope(WEB_DSN)).expect(502);
      expect(JSON.stringify(res.body)).not.toContain('network');
    });

    it('is a 404 when no DSN is configured', async () => {
      await app.close();
      app = await buildApp(UNCONFIGURED);
      await post(envelope(WEB_DSN)).expect(404);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
