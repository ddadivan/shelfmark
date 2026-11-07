import { AUTH_ENDPOINT, AUTH_PROVIDER } from '@shelfmark/contracts';
import type { SocialSignInResponse } from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { OAuthProviderStub } from '../../test-utils/models/oauth-provider-stub.interface';
import { stubOAuthProviders } from '../../test-utils/oauth-provider-stub';
import { setCookiesOf, signInAs, toCookieHeader } from '../../test-utils/sign-in-as';

const AUTH_CODE = 'fake-code-should-never-be-logged';

/** Everything the process writes to stdout, stderr and the console while a test runs. */
function captureOutput(): { text(): string; restore(): void } {
  const chunks: string[] = [];
  const record = (...args: unknown[]): void => {
    chunks.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
  };
  const writeStdout = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    record(String(chunk));
    return true;
  });
  const writeStderr = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    record(String(chunk));
    return true;
  });
  const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(record),
  );
  return {
    text: () => chunks.join('\n'),
    restore() {
      for (const spy of [writeStdout, writeStderr, ...consoles]) {
        spy.mockRestore();
      }
    },
  };
}

describe('Better Auth logging', () => {
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

  it('never logs secrets, codes, provider tokens or session tokens across the flows', async () => {
    const output = captureOutput();
    let leaked: string[];
    try {
      const server = t.app.getHttpServer();
      // Successful flows with both providers and a sign-out.
      for (const provider of [AUTH_PROVIDER.GitHub, AUTH_PROVIDER.Google]) {
        const { cookie } = await signInAs(t.app, t.baseUrl, {
          provider,
          email: `${provider}@example.test`,
          name: provider,
        });
        await request(server)
          .post(AUTH_ENDPOINT.SignOut)
          .set('Origin', t.baseUrl)
          .set('Cookie', cookie)
          .send({});
      }
      const sessionTokens = (await t.db.prisma.session.findMany()).map((s) => s.token);

      // Failures: provider token endpoint down, bad state, foreign callback URL.
      for (const provider of [AUTH_PROVIDER.GitHub, AUTH_PROVIDER.Google]) {
        stub = stubOAuthProviders({
          tokenEndpointStatus: 500,
          github: { id: 9, login: 'z', name: 'Z', email: 'z@example.test', emailVerified: true },
          google: { sub: '9', name: 'Z', email: 'z@example.test', emailVerified: true },
        });
        const start = await request(server)
          .post(AUTH_ENDPOINT.SignInSocial)
          .set('Origin', t.baseUrl)
          .send({ provider, callbackURL: `${t.baseUrl}/` });
        const state = new URL((start.body as SocialSignInResponse).url).searchParams.get('state');
        const failed = await request(server)
          .get(`/api/auth/callback/${provider}`)
          .query({ code: AUTH_CODE, state })
          .set('Cookie', toCookieHeader(setCookiesOf(start)));
        expect(failed.status).toBe(302);
        expect(String(failed.headers['location'])).toContain('error=');
        stub.restore();
        stub = undefined;
      }
      await request(server)
        .get('/api/auth/callback/github')
        .query({ code: AUTH_CODE, state: 'bogus' });
      await request(server)
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({ provider: AUTH_PROVIDER.GitHub, callbackURL: 'https://evil.example/' });

      const logged = output.text();
      const watched = [
        ...t.secrets,
        AUTH_CODE,
        ...sessionTokens,
        ...(await t.db.prisma.verification.findMany()).map((v) => v.value),
      ];
      leaked = watched.filter((value) => value.length > 0 && logged.includes(value));
    } finally {
      output.restore();
    }
    expect(leaked).toEqual([]);
  });

  it('logs the provider failure by message only (the adapter drops the arguments)', async () => {
    const output = captureOutput();
    let logged: string;
    try {
      stub = stubOAuthProviders({
        tokenEndpointStatus: 500,
        github: { id: 9, login: 'z', name: 'Z', email: 'z@example.test', emailVerified: true },
      });
      const server = t.app.getHttpServer();
      const start = await request(server)
        .post(AUTH_ENDPOINT.SignInSocial)
        .set('Origin', t.baseUrl)
        .send({ provider: AUTH_PROVIDER.GitHub, callbackURL: `${t.baseUrl}/` });
      const state = new URL((start.body as SocialSignInResponse).url).searchParams.get('state');
      await request(server)
        .get('/api/auth/callback/github')
        .query({ code: AUTH_CODE, state })
        .set('Cookie', toCookieHeader(setCookiesOf(start)));
      logged = output.text();
    } finally {
      output.restore();
    }
    expect(logged).toContain('GitHub OAuth token exchange failed');
    expect(logged).not.toContain('server_error');
  });
});
