import type { NestExpressApplication } from '@nestjs/platform-express';
import { AUTH_ENDPOINT, AUTH_PROVIDER } from '@shelfmark/contracts';
import type { GetSessionResponse, SocialSignInResponse } from '@shelfmark/contracts';
import request from 'supertest';
import type { SignedInUser } from './models/signed-in-user.interface';
import type { SignInAsOptions } from './models/sign-in-as-options.interface';
import { stubOAuthProviders } from './oauth-provider-stub';

const SESSION_COOKIE = /session_token=/;
let nextAccountId = 1000;

/** The `Set-Cookie` headers of a response as a list (empty when there are none). */
export function setCookiesOf(response: { headers: object }): string[] {
  const value: unknown = Reflect.get(response.headers, 'set-cookie');
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return typeof value === 'string' ? [value] : [];
}

/** Turns `Set-Cookie` headers into a `Cookie` header value (live cookies only, later wins). */
export function toCookieHeader(setCookies: string[], previous = ''): string {
  const jar = new Map<string, string>();
  for (const pair of previous.split('; ').filter(Boolean)) {
    const [name, ...rest] = pair.split('=');
    jar.set(name, rest.join('='));
  }
  for (const header of setCookies) {
    const [pair, ...attributes] = header.split('; ');
    const [name, ...rest] = pair.split('=');
    const value = rest.join('=');
    const expired = attributes.some((a) => /^max-age=0$/i.test(a)) || value === '';
    if (expired) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

function expectStatus(actual: number, expected: number, step: string): void {
  if (actual !== expected) {
    throw new Error(`${step} answered ${actual}, expected ${expected}`);
  }
}

/**
 * Signs a user in through the real Better Auth flow with the provider faked by
 * `stubOAuthProviders`: POST sign-in/social, then the provider callback with the `state` from the
 * authorize URL and the state cookie. Returns the user id and a valid signed session cookie, so
 * data-isolation tests (#65 on) get two real users without touching Better Auth internals.
 * Call it again with another email for the second user.
 */
export async function signInAs(
  app: NestExpressApplication,
  baseUrl: string,
  options: SignInAsOptions,
): Promise<SignedInUser> {
  const provider = options.provider ?? AUTH_PROVIDER.GitHub;
  const emailVerified = options.emailVerified ?? true;
  const accountId = nextAccountId++;
  const stub = stubOAuthProviders({
    github: {
      id: accountId,
      login: `user${accountId}`,
      name: options.name,
      email: options.email,
      emailVerified,
    },
    google: { sub: String(accountId), name: options.name, email: options.email, emailVerified },
  });
  const label = `signInAs(${options.email}, ${provider})`;
  try {
    const server = app.getHttpServer();
    const start = await request(server)
      .post(AUTH_ENDPOINT.SignInSocial)
      .set('Origin', baseUrl)
      .send({ provider, callbackURL: `${baseUrl}/` });
    expectStatus(start.status, 200, `${label}: sign-in/social`);
    const { url } = start.body as SocialSignInResponse;
    const state = new URL(url).searchParams.get('state') ?? '';
    const stateCookies = toCookieHeader(setCookiesOf(start));

    const callback = await request(server)
      .get(`/api/auth/callback/${provider}`)
      .query({ code: 'fake-code', state })
      .set('Cookie', stateCookies);
    expectStatus(callback.status, 302, `${label}: callback`);
    const setCookies = setCookiesOf(callback);
    if (!setCookies.some((header) => SESSION_COOKIE.test(header))) {
      throw new Error(
        `${label}: the callback did not create a session ` +
          `(status ${callback.status}, redirected to ${callback.headers['location']})`,
      );
    }
    const cookie = toCookieHeader(setCookies, stateCookies);

    const session = await request(server).get(AUTH_ENDPOINT.GetSession).set('Cookie', cookie);
    expectStatus(session.status, 200, `${label}: get-session`);
    const body = session.body as GetSessionResponse;
    if (!body) {
      throw new Error(`${label}: get-session returned null for the new session cookie`);
    }
    return { userId: body.user.id, cookie };
  } finally {
    stub.restore();
  }
}
