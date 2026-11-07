import { AUTH_ENDPOINT, AUTH_PROVIDER } from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { setCookiesOf, signInAs } from '../../test-utils/sign-in-as';

const PRODUCTION_URL = 'https://app.example.test';

describe('Better Auth in production configuration', () => {
  let t: AuthTestApp;

  beforeAll(async () => {
    t = await createAuthTestApp({
      isProduction: true,
      env: { NODE_ENV: 'production', BETTER_AUTH_URL: PRODUCTION_URL },
    });
  });

  afterAll(async () => {
    await t.close();
  });

  it('issues a Secure, __Secure- prefixed, HttpOnly, SameSite=Lax session cookie', async () => {
    const { cookie } = await signInAs(t.app, PRODUCTION_URL, {
      email: 'prod@example.test',
      name: 'Prod',
      provider: AUTH_PROVIDER.Google,
    });
    expect(cookie).toMatch(/^__Secure-shelfmark\.session_token=/);

    // Sign-out re-sends the cookie with the same attributes it was issued with.
    const out = await request(t.app.getHttpServer())
      .post(AUTH_ENDPOINT.SignOut)
      .set('Origin', PRODUCTION_URL)
      .set('Cookie', cookie)
      .send({})
      .expect(200);
    const cleared = setCookiesOf(out).find((c) => c.includes('session_token='));
    expect(cleared).toMatch(/^__Secure-shelfmark\.session_token=/);
    expect(cleared).toMatch(/Secure/);
    expect(cleared).toMatch(/HttpOnly/i);
    expect(cleared).toMatch(/SameSite=Lax/i);
  });

  it('builds the provider callback from BETTER_AUTH_URL', async () => {
    const res = await request(t.app.getHttpServer())
      .post(AUTH_ENDPOINT.SignInSocial)
      .set('Origin', PRODUCTION_URL)
      .send({ provider: AUTH_PROVIDER.GitHub, callbackURL: `${PRODUCTION_URL}/` })
      .expect(200);
    const url = new URL((res.body as { url: string }).url);
    expect(url.searchParams.get('redirect_uri')).toBe(`${PRODUCTION_URL}/api/auth/callback/github`);
    const state = setCookiesOf(res).find((c) => c.includes('state='));
    expect(state).toMatch(/^__Secure-shelfmark\./);
    expect(state).toMatch(/Secure/);
    expect(state).toMatch(/HttpOnly/i);
  });
});
