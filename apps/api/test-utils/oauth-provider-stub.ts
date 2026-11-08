import { randomBytes } from 'node:crypto';
import type { OAuthProviderStub } from './models/oauth-provider-stub.interface';
import type { OAuthProviderStubOptions } from './models/oauth-provider-stub-options.interface';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function requestUrl(input: string | URL | Request): { url: string; method: string } {
  if (input instanceof Request) {
    return { url: input.url, method: input.method.toUpperCase() };
  }
  return { url: String(input), method: 'GET' };
}

/**
 * Replaces `globalThis.fetch` with an in-process fake of the GitHub and Google OAuth endpoints
 * (Better Auth resolves `fetch` on every call, so a spy is enough; Supertest uses `node:http` and
 * is not affected). Any other URL throws: tests can never reach the network. The Google ID token
 * is unsigned: on the code flow Better Auth only decodes it and fetches no keys. All tokens are
 * random per run; call `restore()` in `afterEach`.
 */
export function stubOAuthProviders(options: OAuthProviderStubOptions): OAuthProviderStub {
  const tokens = {
    githubAccess: `gho_${randomBytes(12).toString('hex')}`,
    googleAccess: `ya29.${randomBytes(12).toString('hex')}`,
    googleRefresh: `1//${randomBytes(12).toString('hex')}`,
    googleId: '',
  };
  const { github, google } = options;
  if (google) {
    tokens.googleId = [
      base64Url({ alg: 'none', typ: 'JWT' }),
      base64Url({
        iss: 'https://accounts.google.com',
        sub: google.sub,
        name: google.name,
        email: google.email,
        email_verified: google.emailVerified,
      }),
      randomBytes(8).toString('base64url'),
    ].join('.');
  }
  const requests: string[] = [];
  const original = globalThis.fetch;

  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const found = requestUrl(input);
    const method = (init?.method ?? found.method).toUpperCase();
    const url = found.url.split('?')[0];
    requests.push(`${method} ${url}`);

    if (options.tokenEndpointStatus && (url === GITHUB_TOKEN_URL || url === GOOGLE_TOKEN_URL)) {
      return Promise.resolve(json({ error: 'server_error' }, options.tokenEndpointStatus));
    }
    if (github && method === 'POST' && url === GITHUB_TOKEN_URL) {
      return Promise.resolve(
        json({ access_token: tokens.githubAccess, token_type: 'bearer', scope: 'read:user' }),
      );
    }
    if (github && method === 'GET' && url === GITHUB_USER_URL) {
      return Promise.resolve(
        json({
          id: github.id,
          login: github.login,
          name: github.name,
          email: github.email,
          avatar_url: 'https://avatars.example.test/u.png',
        }),
      );
    }
    if (github && method === 'GET' && url === GITHUB_EMAILS_URL) {
      return Promise.resolve(
        json([
          { email: github.email, primary: true, verified: github.emailVerified, visibility: null },
        ]),
      );
    }
    if (google && method === 'POST' && url === GOOGLE_TOKEN_URL) {
      return Promise.resolve(
        json({
          access_token: tokens.googleAccess,
          refresh_token: tokens.googleRefresh,
          id_token: tokens.googleId,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid email profile',
        }),
      );
    }
    throw new Error(`Unexpected outbound request in test: ${method} ${url}`);
  });

  return {
    tokens: Object.values(tokens).filter((token) => token !== ''),
    requests,
    restore() {
      spy.mockRestore();
      globalThis.fetch = original;
    },
  };
}
