import { AUTH_ENDPOINT, AUTH_PROVIDER } from '@shelfmark/contracts';
import type { SocialSignInResponse } from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { stubOAuthProviders } from '../../test-utils/oauth-provider-stub';
import type { OAuthProviderStub } from '../../test-utils/models/oauth-provider-stub.interface';
import { setCookiesOf, signInAs, toCookieHeader } from '../../test-utils/sign-in-as';
import { DISABLED_AUTH_PATHS } from './models/disabled-auth-path.const';

const EVIL = 'https://evil.example';

describe('Better Auth security', () => {
  let t: AuthTestApp;
  let stub: OAuthProviderStub | undefined;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  afterEach(async () => {
    stub?.restore();
    stub = undefined;
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const server = () => t.app.getHttpServer();

  describe('CSRF and redirects', () => {
    it('rejects sign-out from a foreign origin and keeps the session', async () => {
      const { cookie } = await signInAs(t.app, t.baseUrl, { email: 'c@example.test', name: 'C' });
      await request(server())
        .post(AUTH_ENDPOINT.SignOut)
        .set('Origin', EVIL)
        .set('Cookie', cookie)
        .send({})
        .expect(403);
      expect(await t.db.prisma.session.count()).toBe(1);
    });

    it('rejects a cookie-bearing sign-out without an Origin header', async () => {
      const { cookie } = await signInAs(t.app, t.baseUrl, { email: 'c@example.test', name: 'C' });
      await request(server())
        .post(AUTH_ENDPOINT.SignOut)
        .set('Cookie', cookie)
        .send({})
        .expect(403);
      expect(await t.db.prisma.session.count()).toBe(1);
    });

    it.each([
      ['callbackURL', { callbackURL: `${EVIL}/` }],
      ['errorCallbackURL', { callbackURL: 'http://localhost:4200/', errorCallbackURL: `${EVIL}/` }],
    ])('rejects a foreign %s', async (_name, body) => {
      const res = await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({ provider: AUTH_PROVIDER.GitHub, ...body });
      expect(res.status).toBe(403);
      expect(JSON.stringify(res.body)).not.toContain('github.com');
    });

    it('rejects sign-in started from a foreign origin when cookies are present', async () => {
      const { cookie } = await signInAs(t.app, t.baseUrl, { email: 'c@example.test', name: 'C' });
      await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', EVIL)
        .set('Cookie', cookie)
        .send({ provider: AUTH_PROVIDER.GitHub, callbackURL: `${t.baseUrl}/` })
        .expect(403);
    });

    it('keeps the origin check on even when TEST is truthy (Better Auth test-mode default)', async () => {
      const { cookie } = await signInAs(t.app, t.baseUrl, { email: 't@example.test', name: 'T' });
      const previous = process.env['TEST'];
      process.env['TEST'] = 'true';
      try {
        await request(server())
          .post(AUTH_ENDPOINT.SignOut)
          .set('Origin', EVIL)
          .set('Cookie', cookie)
          .send({})
          .expect(403);
        await request(server())
          .post(AUTH_ENDPOINT.SignInSocial)
          .set('Origin', t.baseUrl)
          .send({ provider: AUTH_PROVIDER.GitHub, callbackURL: `${EVIL}/` })
          .expect(403);
      } finally {
        if (previous === undefined) {
          delete process.env['TEST'];
        } else {
          process.env['TEST'] = previous;
        }
      }
      expect(await t.db.prisma.session.count()).toBe(1);
    });

    it('rejects an unknown provider', async () => {
      const res = await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({ provider: 'facebook', callbackURL: `${t.baseUrl}/` });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    describe('OAuth callback state', () => {
      async function start() {
        const res = await request(server())
          .post(AUTH_ENDPOINT.SignInSocial)
          .set('Origin', t.baseUrl)
          .send({ provider: AUTH_PROVIDER.GitHub, callbackURL: `${t.baseUrl}/links` });
        return {
          state: new URL((res.body as SocialSignInResponse).url).searchParams.get('state') ?? '',
          cookies: toCookieHeader(setCookiesOf(res)),
        };
      }

      beforeEach(() => {
        stub = stubOAuthProviders({
          github: { id: 1, login: 'x', name: 'X', email: 'x@example.test', emailVerified: true },
        });
      });

      async function expectNoSession(res: request.Response) {
        expect(res.status).toBe(302);
        const location = new URL(String(res.headers['location']));
        expect(location.origin).toBe(t.baseUrl);
        expect(location.pathname).toBe('/sign-in');
        expect(location.searchParams.get('error')).toBeTruthy();
        expect(
          setCookiesOf(res).some((c) => c.includes('session_token=') && !/Max-Age=0/i.test(c)),
        ).toBe(false);
        expect(await t.db.prisma.session.count()).toBe(0);
        expect(await t.db.prisma.user.count()).toBe(0);
      }

      it('redirects to the error page for a mismatched state', async () => {
        const { cookies } = await start();
        const res = await request(server())
          .get('/api/auth/callback/github')
          .query({ code: 'fake-code', state: 'not-the-state' })
          .set('Cookie', cookies);
        await expectNoSession(res);
      });

      it('redirects to the error page for a missing state', async () => {
        const { cookies } = await start();
        const res = await request(server())
          .get('/api/auth/callback/github')
          .query({ code: 'fake-code' })
          .set('Cookie', cookies);
        await expectNoSession(res);
      });

      it('rejects a valid state without the state cookie (login CSRF)', async () => {
        const { state } = await start();
        const res = await request(server())
          .get('/api/auth/callback/github')
          .query({ code: 'fake-code', state });
        await expectNoSession(res);
      });

      it('redirects to the error page when the provider reports an error', async () => {
        const { state, cookies } = await start();
        const res = await request(server())
          .get('/api/auth/callback/github')
          .query({ error: 'access_denied', state })
          .set('Cookie', cookies);
        await expectNoSession(res);
      });

      it('does not accept the same state twice', async () => {
        const { state, cookies } = await start();
        await request(server())
          .get('/api/auth/callback/github')
          .query({ code: 'fake-code', state })
          .set('Cookie', cookies)
          .expect(302);
        expect(await t.db.prisma.session.count()).toBe(1);
        const replay = await request(server())
          .get('/api/auth/callback/github')
          .query({ code: 'fake-code', state })
          .set('Cookie', cookies);
        expect(new URL(String(replay.headers['location'])).pathname).toBe('/sign-in');
        expect(await t.db.prisma.session.count()).toBe(1);
      });
    });
  });

  describe('attack surface', () => {
    it.each(DISABLED_AUTH_PATHS)('%s is not served (GET and POST)', async (path) => {
      const get = await request(server()).get(`/api/auth${path}`);
      const post = await request(server())
        .post(`/api/auth${path}`)
        .set('Origin', t.baseUrl)
        .send({});
      expect(get.status).toBe(404);
      expect(post.status).toBe(404);
    });

    it.each(['/reset-password/abc', '/callback/facebook', '/Get-Session', '/get-session/'])(
      'GET /api/auth%s is a 404 from the allow-list',
      async (path) => {
        const res = await request(server()).get(`/api/auth${path}`);
        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ statusCode: 404, requestId: expect.any(String) });
      },
    );

    it('cannot create users, set isDemo or change a profile through the router', async () => {
      const { cookie, userId } = await signInAs(t.app, t.baseUrl, {
        email: 'p@example.test',
        name: 'P',
      });
      await request(server())
        .post('/api/auth/sign-up/email')
        .set('Origin', t.baseUrl)
        .send({ email: 'new@example.test', password: 'x'.repeat(16), name: 'N', isDemo: true })
        .expect(404);
      await request(server())
        .post('/api/auth/update-user')
        .set('Origin', t.baseUrl)
        .set('Cookie', cookie)
        .send({ isDemo: true, name: 'Hacked' })
        .expect(404);
      const user = await t.db.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user).toMatchObject({ isDemo: false, name: 'P' });
      expect(await t.db.prisma.user.count()).toBe(1);
    });

    it('does not let a client set isDemo through the social sign-in body', async () => {
      stub = stubOAuthProviders({
        github: { id: 77, login: 'd', name: 'D', email: 'd@example.test', emailVerified: true },
      });
      const start = await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({
          provider: AUTH_PROVIDER.GitHub,
          callbackURL: `${t.baseUrl}/`,
          requestSignUp: true,
          additionalData: { isDemo: true },
        });
      const state = new URL((start.body as SocialSignInResponse).url).searchParams.get('state');
      await request(server())
        .get('/api/auth/callback/github')
        .query({ code: 'fake-code', state })
        .set('Cookie', toCookieHeader(setCookiesOf(start)))
        .expect(302);
      expect(await t.db.prisma.user.findFirstOrThrow()).toMatchObject({ isDemo: false });
    });

    it('sends no CORS headers (same origin, ADR 0007)', async () => {
      const preflight = await request(server())
        .options(AUTH_ENDPOINT.GetSession)
        .set('Origin', EVIL)
        .set('Access-Control-Request-Method', 'GET');
      const own = await request(server()).get(AUTH_ENDPOINT.GetSession).set('Origin', t.baseUrl);
      const foreign = await request(server()).get(AUTH_ENDPOINT.GetSession).set('Origin', EVIL);
      for (const res of [preflight, own, foreign]) {
        const names = Object.keys(res.headers).filter((h) => h.startsWith('access-control-'));
        expect(names).toEqual([]);
      }
    });

    it('serves auth responses with a request id, helmet headers and no caching', async () => {
      const res = await request(server()).get(AUTH_ENDPOINT.GetSession);
      expect(res.headers['x-request-id']).toBeTruthy();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cache-control']).toMatch(/no-store/);
    });
  });

  describe('request body limits', () => {
    it('keeps the 400 and 413 mapping of the global JSON parser on auth routes', async () => {
      const malformed = await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .set('Content-Type', 'application/json')
        .send('{"provider":');
      expect(malformed.status).toBe(400);
      expect(malformed.body).toMatchObject({ statusCode: 400, requestId: expect.any(String) });

      const oversized = await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({ provider: AUTH_PROVIDER.GitHub, callbackURL: 'x'.repeat(200_000) });
      expect(oversized.status).toBe(413);
    });
  });
});
