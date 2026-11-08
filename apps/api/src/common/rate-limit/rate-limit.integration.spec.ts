import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Logger,
  Post,
  type Provider,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SkipThrottle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../../app/configure-app';
import { createApp } from '../../app/create-app';
import { CsrfGuard } from '../csrf/csrf.guard';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { RATE_LIMIT } from './models/rate-limit.const';
import { RateLimit } from './rate-limit.decorator';
import { createRateLimitOptions } from './rate-limit-options';

const VERCEL_IP = 'x-vercel-forwarded-for';
const TRUSTED = 'http://localhost:4200';

@Controller('probe')
class ProbeController {
  @Get('default')
  defaults(): { ok: true } {
    return { ok: true };
  }

  @Get('other')
  other(): { ok: true } {
    return { ok: true };
  }

  @RateLimit({ limit: 2, ttl: 60_000 })
  @Get('strict')
  strict(): { ok: true } {
    return { ok: true };
  }

  @SkipThrottle()
  @Get('skipped')
  skipped(): { ok: true } {
    return { ok: true };
  }

  @Post('echo')
  echo(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return body;
  }

  @Delete('item')
  remove(): { ok: true } {
    return { ok: true };
  }

  @Get('boom')
  boom(): never {
    throw new HttpException('nope', 418);
  }
}

const PROVIDERS: Provider[] = [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  { provide: APP_GUARD, useValue: new CsrfGuard([TRUSTED]) },
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
];

describe('rate limiting over HTTP', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(createRateLimitOptions(true))],
      controllers: [ProbeController],
      providers: PROVIDERS,
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureApp(app, { isProduction: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 as ApiError with Retry-After once a route override is exceeded', async () => {
    const ip = '203.0.113.10';
    await request(app.getHttpServer()).get('/api/probe/strict').set(VERCEL_IP, ip).expect(200);
    await request(app.getHttpServer()).get('/api/probe/strict').set(VERCEL_IP, ip).expect(200);
    const res = await request(app.getHttpServer())
      .get('/api/probe/strict')
      .set(VERCEL_IP, ip)
      .set('X-Request-Id', 'rid-429');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toMatch(/^\d+$/);
    expect(res.body).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests, try again later',
      requestId: 'rid-429',
    });
  });

  it('keeps one bucket per client IP (a different IP is not blocked)', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).get('/api/probe/strict').set(VERCEL_IP, '203.0.113.20');
    }
    await request(app.getHttpServer())
      .get('/api/probe/strict')
      .set(VERCEL_IP, '203.0.113.21')
      .expect(200);
  });

  it('falls back to the first x-forwarded-for hop', async () => {
    const send = () =>
      request(app.getHttpServer())
        .get('/api/probe/strict')
        .set('X-Forwarded-For', '198.51.100.30, 10.0.0.1');
    await send().expect(200);
    await send().expect(200);
    await send().expect(429);
    await request(app.getHttpServer())
      .get('/api/probe/strict')
      .set('X-Forwarded-For', '198.51.100.31')
      .expect(200);
  });

  it('applies the default limit to routes without an override', async () => {
    const ip = '203.0.113.40';
    for (let i = 0; i < RATE_LIMIT.Default.limit; i++) {
      await request(app.getHttpServer()).get('/api/probe/default').set(VERCEL_IP, ip).expect(200);
    }
    const res = await request(app.getHttpServer()).get('/api/probe/default').set(VERCEL_IP, ip);
    expect(res.status).toBe(429);
  });

  it('shares the default bucket across routes: per IP overall, not per route', async () => {
    const ip = '203.0.113.41';
    for (let i = 0; i < RATE_LIMIT.Default.limit; i++) {
      await request(app.getHttpServer()).get('/api/probe/default').set(VERCEL_IP, ip).expect(200);
    }
    await request(app.getHttpServer()).get('/api/probe/other').set(VERCEL_IP, ip).expect(429);
    await request(app.getHttpServer())
      .get('/api/probe/other')
      .set(VERCEL_IP, '203.0.113.42')
      .expect(200);
  });

  it('keeps a separate bucket per route for @RateLimit overrides', async () => {
    const ip = '203.0.113.43';
    await request(app.getHttpServer()).get('/api/probe/default').set(VERCEL_IP, ip).expect(200);
    await request(app.getHttpServer()).get('/api/probe/strict').set(VERCEL_IP, ip).expect(200);
    await request(app.getHttpServer()).get('/api/probe/strict').set(VERCEL_IP, ip).expect(200);
    await request(app.getHttpServer()).get('/api/probe/strict').set(VERCEL_IP, ip).expect(429);
    // The strict route's counter does not consume the default bucket.
    await request(app.getHttpServer()).get('/api/probe/other').set(VERCEL_IP, ip).expect(200);
  });

  it('never limits a route marked @SkipThrottle', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .get('/api/probe/skipped')
        .set(VERCEL_IP, '203.0.113.50')
        .expect(200);
    }
  });

  describe('CSRF guard', () => {
    it('rejects a foreign Origin on an unsafe method with 403 ApiError', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/probe/item')
        .set(VERCEL_IP, '203.0.113.60')
        .set('Origin', 'https://evil.test');
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ statusCode: 403, error: 'Forbidden' });
    });

    it('rejects a text/plain body with 415 and accepts JSON', async () => {
      const bad = await request(app.getHttpServer())
        .post('/api/probe/echo')
        .set(VERCEL_IP, '203.0.113.61')
        .set('Content-Type', 'text/plain')
        .send('hello');
      expect(bad.status).toBe(415);
      await request(app.getHttpServer())
        .post('/api/probe/echo')
        .set(VERCEL_IP, '203.0.113.61')
        .set('Origin', TRUSTED)
        .send({ a: 1 })
        .expect(201);
    });
  });

  describe('LoggingInterceptor', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('logs method, path pattern, status, duration and request id only', async () => {
      const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      await request(app.getHttpServer())
        .post('/api/probe/echo?token=SECRET-QUERY')
        .set(VERCEL_IP, '203.0.113.70')
        .set('Cookie', 'session=SECRET-COOKIE')
        .set('Authorization', 'Bearer SECRET-BEARER')
        .set('X-Request-Id', 'rid-log')
        .send({ email: 'person@example.test', password: 'SECRET-BODY' })
        .expect(201);
      const lines = log.mock.calls.map((call) => String(call[0]));
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatch(/^POST \/api\/probe\/echo 201 \d+ms rid-log$/);
      for (const secret of ['SECRET', 'person@example.test', '203.0.113.70']) {
        expect(lines[0]).not.toContain(secret);
      }
    });

    it('logs the status of a failing handler', async () => {
      const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      await request(app.getHttpServer())
        .get('/api/probe/boom')
        .set(VERCEL_IP, '203.0.113.71')
        .set('X-Request-Id', 'rid-boom')
        .expect(418);
      expect(String(log.mock.calls[0][0])).toMatch(/^GET \/api\/probe\/boom 418 \d+ms rid-boom$/);
    });
  });
});

describe('auth routes rate limiting (real app)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp({ isProduction: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('limits sign-in per client IP with ApiError and Retry-After, but not get-session', async () => {
    const ip = '203.0.113.80';
    for (let i = 0; i < RATE_LIMIT.Auth.limit; i++) {
      const res = await request(app.getHttpServer()).post('/api/auth/sign-out').set(VERCEL_IP, ip);
      expect(res.status).not.toBe(429);
    }
    const blocked = await request(app.getHttpServer())
      .post('/api/auth/sign-out')
      .set(VERCEL_IP, ip)
      .set('X-Request-Id', 'rid-auth');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toMatch(/^\d+$/);
    expect(blocked.body).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
      requestId: 'rid-auth',
    });

    const session = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set(VERCEL_IP, ip);
    expect(session.status).not.toBe(429);

    const other = await request(app.getHttpServer())
      .post('/api/auth/sign-out')
      .set(VERCEL_IP, '203.0.113.81');
    expect(other.status).not.toBe(429);
  });

  it('never limits the health check', async () => {
    for (let i = 0; i < RATE_LIMIT.Default.limit + 5; i++) {
      await request(app.getHttpServer())
        .get('/api/health')
        .set(VERCEL_IP, '203.0.113.82')
        .expect(200);
    }
  });
});
