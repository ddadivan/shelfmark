import { AUTH_ENDPOINT, AUTH_PROVIDER } from '@shelfmark/contracts';
import type {
  AuthProvider,
  GetSessionResponse,
  SignOutResponse,
  SocialSignInResponse,
} from '@shelfmark/contracts';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { stubOAuthProviders } from '../../test-utils/oauth-provider-stub';
import type { OAuthProviderStub } from '../../test-utils/models/oauth-provider-stub.interface';
import { setCookiesOf, signInAs, toCookieHeader } from '../../test-utils/sign-in-as';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const AUTHORIZE_HOST: Record<AuthProvider, string> = {
  [AUTH_PROVIDER.Google]: 'https://accounts.google.com/o/oauth2/v2/auth',
  [AUTH_PROVIDER.GitHub]: 'https://github.com/login/oauth/authorize',
};

describe('Better Auth sign-in flow', () => {
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

  describe.each([AUTH_PROVIDER.GitHub, AUTH_PROVIDER.Google])('%s', (provider) => {
    const email = `${provider}@example.test`;

    it('starts with a provider URL that carries state, PKCE and the callback', async () => {
      const res = await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({ provider, callbackURL: `${t.baseUrl}/` })
        .expect(200);
      const body = res.body as SocialSignInResponse;
      const url = new URL(body.url);
      expect(body.redirect).toBe(true);
      expect(`${url.origin}${url.pathname}`).toBe(AUTHORIZE_HOST[provider]);
      expect(url.searchParams.get('state')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('client_id')).toBe(`test-${provider}-client-id`);
      expect(url.searchParams.get('redirect_uri')).toBe(
        `${t.baseUrl}/api/auth/callback/${provider}`,
      );
      expect(url.searchParams.get('scope')).toContain(
        provider === AUTH_PROVIDER.Google ? 'openid' : 'read:user',
      );
    });

    it('signs in: 302 to the callback URL, safe cookie, user, token-free account, session', async () => {
      stub = stubOAuthProviders({
        github: { id: 4242, login: 'ada', name: 'Ada', email, emailVerified: true },
        google: { sub: '4242', name: 'Ada', email, emailVerified: true },
      });
      const start = await request(server())
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({ provider, callbackURL: `${t.baseUrl}/links` });
      const state = new URL((start.body as SocialSignInResponse).url).searchParams.get('state');

      const callback = await request(server())
        .get(`/api/auth/callback/${provider}`)
        .query({ code: 'fake-code', state })
        .set('Cookie', toCookieHeader(setCookiesOf(start)))
        .expect(302);

      expect(callback.headers['location']).toBe(`${t.baseUrl}/links`);
      const session = setCookiesOf(callback).find((c) => c.includes('session_token='));
      expect(session).toMatch(/^shelfmark\.session_token=/);
      expect(session).toMatch(/HttpOnly/i);
      expect(session).toMatch(/SameSite=Lax/i);
      expect(session).toMatch(/Path=\//i);
      expect(session).not.toMatch(/Secure/i);

      const users = await t.db.prisma.user.findMany();
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({ email, name: 'Ada', isDemo: false, emailVerified: true });
      expect(users[0].id).toMatch(UUID_V7);

      const accounts = await t.db.prisma.account.findMany();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatchObject({
        providerId: provider,
        userId: users[0].id,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        password: null,
      });
      const sessions = await t.db.prisma.session.findMany();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe(users[0].id);
      // 7 day lifetime
      const days = (sessions[0].expiresAt.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThanOrEqual(7);
    });

    it('returns exactly the session contract from get-session', async () => {
      const { userId, cookie } = await signInAs(t.app, t.baseUrl, {
        provider,
        email,
        name: 'Ada',
      });
      const res = await request(server())
        .get(AUTH_ENDPOINT.GetSession)
        .set('Cookie', cookie)
        .expect(200);
      const body = res.body as GetSessionResponse;
      expect(body).not.toBeNull();
      expect(Object.keys(body ?? {}).sort()).toEqual(['session', 'user']);
      expect(Object.keys(body?.user ?? {}).sort()).toEqual([
        'email',
        'id',
        'image',
        'isDemo',
        'name',
      ]);
      expect(Object.keys(body?.session ?? {})).toEqual(['expiresAt']);
      expect(body?.user).toMatchObject({ id: userId, email, name: 'Ada', isDemo: false });
      expect(Date.parse(body?.session.expiresAt ?? '')).toBeGreaterThan(Date.now());

      const [row] = await t.db.prisma.session.findMany();
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(row.token);
      expect(text).not.toMatch(/ipAddress|userAgent|token/);
    });
  });

  it('keeps the full session for server-side callers (the guard of #65)', async () => {
    const { userId, cookie } = await signInAs(t.app, t.baseUrl, {
      email: 'server@example.test',
      name: 'Server',
    });
    const result = await t.app
      .get(AuthService)
      .api.getSession({ headers: new Headers({ cookie }) });
    expect(result?.user.id).toBe(userId);
    expect(result?.session.token).toEqual(expect.any(String));
  });

  it('returns null without a session or with a forged cookie', async () => {
    const anonymous = await request(server()).get(AUTH_ENDPOINT.GetSession).expect(200);
    expect(anonymous.body).toBeNull();
    const forged = await request(server())
      .get(AUTH_ENDPOINT.GetSession)
      .set('Cookie', 'shelfmark.session_token=forged.value')
      .expect(200);
    expect(forged.body).toBeNull();
  });

  it('signing in again with the same account reuses the user and adds a session', async () => {
    const first = await signInAs(t.app, t.baseUrl, { email: 'same@example.test', name: 'Same' });
    expect(first.userId).toMatch(UUID_V7);
    // A new provider account id with the same verified email links to the same user.
    const second = await signInAs(t.app, t.baseUrl, { email: 'same@example.test', name: 'Same' });
    expect(second.userId).toBe(first.userId);
    expect(await t.db.prisma.user.count()).toBe(1);
    expect(await t.db.prisma.session.count()).toBe(2);
  });

  describe('account linking', () => {
    it('links Google and GitHub on the same provider-verified email', async () => {
      const viaGoogle = await signInAs(t.app, t.baseUrl, {
        provider: AUTH_PROVIDER.Google,
        email: 'both@example.test',
        name: 'Both',
      });
      const viaGitHub = await signInAs(t.app, t.baseUrl, {
        provider: AUTH_PROVIDER.GitHub,
        email: 'both@example.test',
        name: 'Both',
      });
      expect(viaGitHub.userId).toBe(viaGoogle.userId);
      expect(await t.db.prisma.user.count()).toBe(1);
      const accounts = await t.db.prisma.account.findMany({ orderBy: { providerId: 'asc' } });
      expect(accounts.map((a) => a.providerId)).toEqual(['github', 'google']);
    });

    it('does not link when the provider does not verify the email', async () => {
      await signInAs(t.app, t.baseUrl, {
        provider: AUTH_PROVIDER.Google,
        email: 'victim@example.test',
        name: 'Victim',
      });
      await expect(
        signInAs(t.app, t.baseUrl, {
          provider: AUTH_PROVIDER.GitHub,
          email: 'victim@example.test',
          name: 'Attacker',
          emailVerified: false,
        }),
      ).rejects.toThrow(/did not create a session/);
      expect(await t.db.prisma.user.count()).toBe(1);
      expect(await t.db.prisma.account.count()).toBe(1);
      expect(await t.db.prisma.session.count()).toBe(1);
    });

    it('refuses GitHub users without an email (email_not_found) and creates nothing', async () => {
      await expect(
        signInAs(t.app, t.baseUrl, {
          provider: AUTH_PROVIDER.GitHub,
          email: '',
          name: 'No Mail',
        }),
      ).rejects.toThrow(/error=email_not_found/);
      expect(await t.db.prisma.user.count()).toBe(0);
      expect(await t.db.prisma.session.count()).toBe(0);
    });

    it('keeps different emails as different users', async () => {
      const a = await signInAs(t.app, t.baseUrl, { email: 'a@example.test', name: 'A' });
      const b = await signInAs(t.app, t.baseUrl, { email: 'b@example.test', name: 'B' });
      expect(a.userId).not.toBe(b.userId);
      expect(await t.db.prisma.user.count()).toBe(2);
    });
  });

  describe('sign-out', () => {
    it('deletes the session, expires the cookie and the old cookie stops working', async () => {
      const { cookie } = await signInAs(t.app, t.baseUrl, { email: 'out@example.test', name: 'O' });
      expect(await t.db.prisma.session.count()).toBe(1);

      const res = await request(server())
        .post(AUTH_ENDPOINT.SignOut)
        .set('Origin', t.baseUrl)
        .set('Cookie', cookie)
        .send({})
        .expect(200);
      expect((res.body as SignOutResponse).success).toBe(true);
      const cleared = setCookiesOf(res).find((c) => c.includes('session_token='));
      expect(cleared).toMatch(/Max-Age=0/i);
      expect(await t.db.prisma.session.count()).toBe(0);

      const replay = await request(server())
        .get(AUTH_ENDPOINT.GetSession)
        .set('Cookie', cookie)
        .expect(200);
      expect(replay.body).toBeNull();
    });
  });
});
