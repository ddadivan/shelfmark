import { AUTH_ENDPOINT, DEMO_ENDPOINT, DEMO_LIMIT } from '@shelfmark/contracts';
import type { ApiError, DemoSessionResponse, GetSessionResponse } from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { setCookiesOf, toCookieHeader } from '../../test-utils/sign-in-as';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { DemoSessionService } from '../auth/demo-session.service';
import { DEMO_QUOTA } from './models/demo-quota.const';
import { DEMO_USER } from './models/demo-user.const';

const HOUR_MS = 60 * 60 * 1000;
const SOURCE = '198.51.100.7';

describe('POST /api/demo', () => {
  let t: AuthTestApp;

  beforeAll(async () => {
    // No OAuth provider is configured at all: the demo must not depend on one.
    t = await createAuthTestApp({ providers: false });
  });

  afterEach(async () => {
    await t.db.truncateAll();
    resetRateLimits(t.app);
  });

  afterAll(async () => {
    await t.close();
  });

  const post = (ip = SOURCE) =>
    request(t.app.getHttpServer())
      .post(DEMO_ENDPOINT.Create)
      .set('Origin', t.baseUrl)
      .set('X-Forwarded-For', ip);

  it('creates a demo user and a session, without OAuth configured', async () => {
    const before = Date.now();
    const res = await post().expect(201);
    const body = res.body as DemoSessionResponse;

    expect(body.user).toMatchObject({
      isDemo: true,
      name: DEMO_USER.Name,
      image: null,
    });
    expect(body.user.email).toMatch(/^demo-[0-9a-f-]{36}@demo\.shelfmark\.invalid$/);
    const limitMs = DEMO_LIMIT.SessionHours * HOUR_MS;
    const expires = Date.parse(body.user.demoExpiresAt ?? '');
    expect(expires).toBeGreaterThanOrEqual(before + limitMs - 1000);
    expect(expires).toBeLessThanOrEqual(Date.now() + limitMs + 1000);
    expect(Date.parse(body.session.expiresAt)).toBe(expires);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(body)).not.toMatch(/token/i);

    const user = await t.db.prisma.user.findUniqueOrThrow({ where: { id: body.user.id } });
    expect(user).toMatchObject({ isDemo: true, emailVerified: true });
    expect(user.demoExpiresAt?.getTime()).toBe(expires);
    const session = await t.db.prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.expiresAt.getTime()).toBe(expires);
  });

  it('sets a session cookie that is HttpOnly, Lax, host-scoped and lasts 24 hours', async () => {
    const res = await post().expect(201);
    const header = setCookiesOf(res).find((c) => c.includes('session_token='));
    expect(header).toBeDefined();
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Path=\//);
    expect(header).not.toMatch(/Domain=/i);
    expect(header).not.toMatch(/;\s*Secure/i);
    const maxAge = Number(/Max-Age=(\d+)/i.exec(header ?? '')?.[1]);
    expect(maxAge).toBeGreaterThan(DEMO_LIMIT.SessionHours * 3600 - 5);
    expect(maxAge).toBeLessThanOrEqual(DEMO_LIMIT.SessionHours * 3600);
  });

  it('marks the cookie Secure in production', async () => {
    await t.close();
    t = await createAuthTestApp({
      providers: false,
      isProduction: true,
      env: { NODE_ENV: 'production', BETTER_AUTH_URL: 'https://app.example.test' },
    });
    const res = await request(t.app.getHttpServer())
      .post(DEMO_ENDPOINT.Create)
      .set('Origin', 'https://app.example.test')
      .set('X-Forwarded-For', SOURCE)
      .expect(201);
    const header = setCookiesOf(res).find((c) => c.includes('session_token='));
    expect(header).toMatch(/^__Secure-/);
    expect(header).toMatch(/;\s*Secure/i);
  });

  it('gives a cookie that signs in: get-session reports the demo user', async () => {
    const res = await post().expect(201);
    const cookie = toCookieHeader(setCookiesOf(res));
    const session = await request(t.app.getHttpServer())
      .get(AUTH_ENDPOINT.GetSession)
      .set('Cookie', cookie)
      .expect(200);
    const body = session.body as GetSessionResponse;
    expect(body?.user).toMatchObject({ isDemo: true });
    expect(body?.user.demoExpiresAt).toBe((res.body as DemoSessionResponse).user.demoExpiresAt);
  });

  it('stores a hash of the source, never the address', async () => {
    await post().expect(201);
    const user = await t.db.prisma.user.findFirstOrThrow();
    expect(user.demoSourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(user)).not.toContain(SOURCE);
    await post('198.51.100.8').expect(201);
    const hashes = (await t.db.prisma.user.findMany()).map((u) => u.demoSourceHash);
    expect(new Set(hashes).size).toBe(2);
  });

  it('answers 400 to a body with fields and creates nothing', async () => {
    const res = await post().send({ isDemo: false, demoExpiresAt: '2099-01-01' }).expect(400);
    expect((res.body as ApiError).statusCode).toBe(400);
    expect(await t.db.prisma.user.count()).toBe(0);
  });

  it('answers 403 to a cross-site request and creates nothing', async () => {
    await request(t.app.getHttpServer())
      .post(DEMO_ENDPOINT.Create)
      .set('Origin', 'https://evil.example.test')
      .expect(403);
    await request(t.app.getHttpServer())
      .post(DEMO_ENDPOINT.Create)
      .set('Sec-Fetch-Site', 'cross-site')
      .expect(403);
    expect(await t.db.prisma.user.count()).toBe(0);
  });

  it('does not expose the session endpoint over HTTP', async () => {
    for (const path of ['/api/auth/create-demo-session', '/api/auth/createDemoSession']) {
      const res = await request(t.app.getHttpServer())
        .post(path)
        .set('Origin', t.baseUrl)
        .send({ userId: '0198a7a0-0000-7000-8000-000000000000' });
      expect([403, 404]).toContain(res.status);
    }
    expect(await t.db.prisma.session.count()).toBe(0);
  });

  it('refuses a session for a regular user or an expired demo user', async () => {
    const regular = await t.db.prisma.user.create({
      data: { name: 'R', email: 'r@example.test' },
    });
    const expired = await t.db.prisma.user.create({
      data: {
        name: 'E',
        email: 'e@example.test',
        isDemo: true,
        demoExpiresAt: new Date(Date.now() - 1000),
      },
    });
    const api = t.app.get(
      await import('@thallesp/nestjs-better-auth').then((m) => m.AuthService),
    ).api;
    for (const user of [regular, expired]) {
      await expect(api.createDemoSession({ body: { userId: user.id } })).rejects.toMatchObject({
        statusCode: 403,
      });
    }
    expect(await t.db.prisma.session.count()).toBe(0);
  });

  it('limits one source in Postgres and answers 429 with Retry-After', async () => {
    for (let i = 0; i < DEMO_QUOTA.PerSource; i++) {
      resetRateLimits(t.app);
      await post().expect(201);
    }
    // The throttler is cleared: only the database quota can refuse this one.
    resetRateLimits(t.app);
    const res = await post().expect(429);
    expect((res.body as ApiError).statusCode).toBe(429);
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(DEMO_QUOTA.WindowMs / 1000);
    expect(await t.db.prisma.user.count()).toBe(DEMO_QUOTA.PerSource);
    // Another source is unaffected.
    await post('198.51.100.99').expect(201);
  });

  it('counts only the window: old demo users of the source do not block it', async () => {
    for (let i = 0; i < DEMO_QUOTA.PerSource; i++) {
      resetRateLimits(t.app);
      await post().expect(201);
    }
    await t.db.prisma.user.updateMany({
      data: { createdAt: new Date(Date.now() - DEMO_QUOTA.WindowMs - 60_000) },
    });
    resetRateLimits(t.app);
    await post().expect(201);
  });

  it('answers 429 from the throttler as well, before any database work', async () => {
    for (let i = 0; i < DEMO_QUOTA.PerSource; i++) await post().expect(201);
    const res = await post().expect(429);
    expect(res.headers['retry-after']).toMatch(/^\d+$/);
  });

  it('answers 503 when the active cap is reached and creates nothing', async () => {
    const now = Date.now();
    await t.db.prisma.user.createMany({
      data: Array.from({ length: DEMO_QUOTA.ActiveCap }, (_, i) => ({
        name: 'D',
        email: `cap-${i}@demo.shelfmark.invalid`,
        isDemo: true,
        demoExpiresAt: new Date(now + HOUR_MS),
      })),
    });
    const res = await post().expect(503);
    expect((res.body as ApiError).message).toBe('Service Unavailable');
    expect(await t.db.prisma.user.count()).toBe(DEMO_QUOTA.ActiveCap);

    // Expired sandboxes do not count against the cap.
    await t.db.prisma.user.updateMany({ data: { demoExpiresAt: new Date(now - 1000) } });
    await post().expect(201);
  });

  it('removes the user again when the session cannot be created', async () => {
    const sessions = t.app.get(DemoSessionService);
    const start = vi.spyOn(sessions, 'start').mockRejectedValue(new Error('boom'));
    try {
      await post().expect(500);
    } finally {
      start.mockRestore();
    }
    expect(await t.db.prisma.user.count()).toBe(0);
  });

  it('creates users through signInDemo with distinct sources', async () => {
    const first = await signInDemo(t.app, t.baseUrl);
    const second = await signInDemo(t.app, t.baseUrl);
    expect(first.userId).not.toBe(second.userId);
    expect(first.cookie).toMatch(/session_token=/);
  });
});
