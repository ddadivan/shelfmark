import { randomBytes } from 'node:crypto';
import { readAuthConfig } from './auth-config';
import { AUTH_DEFAULT_SECRET } from './models/auth-default-secret.const';
import { NODE_ENV } from './models/node-env.const';

// Every secret is generated per run: fixtures hold none.
const secret = randomBytes(32).toString('hex');
const clientSecret = randomBytes(16).toString('hex');
const PROVIDERS = {
  GOOGLE_CLIENT_ID: 'google-id',
  GOOGLE_CLIENT_SECRET: clientSecret,
  GITHUB_CLIENT_ID: 'github-id',
  GITHUB_CLIENT_SECRET: clientSecret,
};
const PROD = {
  NODE_ENV: NODE_ENV.Production,
  BETTER_AUTH_URL: 'https://app.example.test',
  ...PROVIDERS,
};

function env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: NODE_ENV.Test, BETTER_AUTH_SECRET: secret, ...extra };
}

describe('readAuthConfig', () => {
  it('defaults the base URL to the web dev server outside production', () => {
    const config = readAuthConfig(env());
    expect(config.baseUrl).toBe('http://localhost:4200');
    expect(config.trustedOrigins).toEqual(['http://localhost:4200']);
    expect(config.isProduction).toBe(false);
    expect(config.providers).toEqual({ google: undefined, github: undefined });
  });

  it.each([undefined, ''])('requires the secret (%j)', (value) => {
    expect(() => readAuthConfig(env({ BETTER_AUTH_SECRET: value }))).toThrow(
      /BETTER_AUTH_SECRET is required/,
    );
  });

  it('rejects a short secret without echoing it', () => {
    const short = randomBytes(8).toString('hex');
    const attempt = () => readAuthConfig(env({ BETTER_AUTH_SECRET: short }));
    expect(attempt).toThrow(/BETTER_AUTH_SECRET must be at least 32 characters/);
    expect(attempt).not.toThrow(new RegExp(short));
  });

  it('rejects the Better Auth default secret', () => {
    expect(() => readAuthConfig(env({ BETTER_AUTH_SECRET: AUTH_DEFAULT_SECRET }))).toThrow(
      /must not be the default secret/,
    );
  });

  it('requires the base URL in production (no fallback)', () => {
    expect(() => readAuthConfig(env({ NODE_ENV: NODE_ENV.Production }))).toThrow(
      /BETTER_AUTH_URL is required in production/,
    );
    expect(() => readAuthConfig(env({ NODE_ENV: undefined }))).toThrow(
      /BETTER_AUTH_URL is required in production/,
    );
  });

  it('treats an unset NODE_ENV as production (fail-safe)', () => {
    expect(() =>
      readAuthConfig(env({ NODE_ENV: undefined, BETTER_AUTH_URL: 'http://app.example.test' })),
    ).toThrow(/must use https in production/);
  });

  it.each(['true', '1', 'false'])('refuses TEST=%s in production, allows it elsewhere', (value) => {
    expect(() => readAuthConfig(env({ ...PROD, TEST: value }))).toThrow(
      /TEST must not be set in production/,
    );
    expect(readAuthConfig(env({ TEST: value })).isProduction).toBe(false);
  });

  it('accepts an https base URL in production', () => {
    const config = readAuthConfig(env(PROD));
    expect(config.baseUrl).toBe('https://app.example.test');
    expect(config.isProduction).toBe(true);
  });

  it('rejects http in production but allows it locally', () => {
    expect(() =>
      readAuthConfig(env({ ...PROD, BETTER_AUTH_URL: 'http://app.example.test' })),
    ).toThrow(/must use https in production/);
    expect(readAuthConfig(env({ BETTER_AUTH_URL: 'http://localhost:4200' })).baseUrl).toBe(
      'http://localhost:4200',
    );
  });

  it.each([
    'https://app.example.test/path',
    'https://app.example.test/',
    'https://app.example.test?x=1',
    'https://user:pw@app.example.test',
    'https://app.example.test#frag',
  ])('rejects a base URL that is not a bare origin (%s)', (value) => {
    expect(() => readAuthConfig(env({ ...PROD, BETTER_AUTH_URL: value }))).toThrow(
      /BETTER_AUTH_URL must be an origin only/,
    );
  });

  it('rejects a base URL that is not a URL or not http(s), without echoing it', () => {
    expect(() => readAuthConfig(env({ BETTER_AUTH_URL: 'not-a-url-zzz' }))).toThrow(
      /must be a valid origin/,
    );
    expect(() => readAuthConfig(env({ BETTER_AUTH_URL: 'not-a-url-zzz' }))).not.toThrow(/zzz/);
    expect(() => readAuthConfig(env({ BETTER_AUTH_URL: 'ftp://app.example.test' }))).toThrow(
      /must use http or https/,
    );
  });

  it('parses trusted origins, trims, dedupes and always includes the base URL', () => {
    const config = readAuthConfig(
      env({
        ...PROD,
        BETTER_AUTH_TRUSTED_ORIGINS:
          ' https://preview.example.test , ,https://app.example.test,https://other.example.test:8443',
      }),
    );
    expect(config.trustedOrigins).toEqual([
      'https://app.example.test',
      'https://preview.example.test',
      'https://other.example.test:8443',
    ]);
  });

  it.each(['https://*.example.test', 'https://a.example.test/path'])(
    'rejects wildcard or path trusted origins (%s)',
    (value) => {
      expect(() => readAuthConfig(env({ ...PROD, BETTER_AUTH_TRUSTED_ORIGINS: value }))).toThrow(
        /BETTER_AUTH_TRUSTED_ORIGINS must/,
      );
    },
  );

  it('registers a provider only with both variables', () => {
    const config = readAuthConfig(
      env({
        GOOGLE_CLIENT_ID: 'google-id',
        GOOGLE_CLIENT_SECRET: clientSecret,
        GITHUB_CLIENT_ID: 'github-id',
        GITHUB_CLIENT_SECRET: clientSecret,
      }),
    );
    expect(config.providers.google).toEqual({ clientId: 'google-id', clientSecret });
    expect(config.providers.github).toEqual({ clientId: 'github-id', clientSecret });
  });

  it.each([
    [
      'Google',
      'GOOGLE_CLIENT_ID',
      /GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production/,
    ],
    [
      'GitHub',
      'GITHUB_CLIENT_ID',
      /GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required in production/,
    ],
  ])('refuses production without %s sign-in (ADR 0026)', (_name, idVar, message) => {
    const secretVar = idVar.replace('_ID', '_SECRET');
    expect(() =>
      readAuthConfig(env({ ...PROD, [idVar]: undefined, [secretVar]: undefined })),
    ).toThrow(message);
  });

  it('allows a missing provider outside production', () => {
    const config = readAuthConfig(env());
    expect(config.providers).toEqual({ google: undefined, github: undefined });
  });

  it.each([
    [{ GOOGLE_CLIENT_ID: 'id' }, /GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together/],
    [
      { GOOGLE_CLIENT_SECRET: 'x' },
      /GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together/,
    ],
    [{ GITHUB_CLIENT_ID: 'id' }, /GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together/],
    [
      { GITHUB_CLIENT_SECRET: 'x' },
      /GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set together/,
    ],
  ])('rejects a half provider pair (%j)', (extra, message) => {
    expect(() => readAuthConfig(env(extra))).toThrow(message);
  });

  it('never puts a secret value into an error message', () => {
    const attempt = () =>
      readAuthConfig(
        env({
          GITHUB_CLIENT_ID: 'id-only',
          BETTER_AUTH_URL: 'bad',
          GOOGLE_CLIENT_SECRET: clientSecret,
        }),
      );
    expect(attempt).toThrow();
    expect(attempt).not.toThrow(new RegExp(`${secret}|${clientSecret}`));
  });

  describe('Vercel preview deployments', () => {
    const PREVIEW = { NODE_ENV: NODE_ENV.Production, VERCEL_ENV: 'preview' };
    const branch = 'shelfmark-git-feat-x-team.vercel.app';
    const deployment = 'shelfmark-abc123-team.vercel.app';

    it('boots without any OAuth provider (demo-only previews, ADR 0026)', () => {
      const config = readAuthConfig(env({ ...PREVIEW, VERCEL_BRANCH_URL: branch }));
      expect(config.providers).toEqual({ google: undefined, github: undefined });
    });

    it('falls back to the branch URL and trusts both hostnames', () => {
      const config = readAuthConfig(
        env({ ...PREVIEW, VERCEL_BRANCH_URL: branch, VERCEL_URL: deployment }),
      );
      expect(config.baseUrl).toBe(`https://${branch}`);
      expect(config.trustedOrigins).toEqual([`https://${branch}`, `https://${deployment}`]);
    });

    it('falls back to the deployment URL when the branch URL is missing', () => {
      const config = readAuthConfig(env({ ...PREVIEW, VERCEL_URL: deployment }));
      expect(config.baseUrl).toBe(`https://${deployment}`);
      expect(config.trustedOrigins).toEqual([`https://${deployment}`]);
    });

    it('still requires BETTER_AUTH_URL when both Vercel URLs are missing', () => {
      expect(() => readAuthConfig(env(PREVIEW))).toThrow(/BETTER_AUTH_URL is required/);
    });

    it('keeps an explicit BETTER_AUTH_URL as the base URL', () => {
      const config = readAuthConfig(
        env({ ...PREVIEW, ...PROD, VERCEL_BRANCH_URL: branch, VERCEL_URL: deployment }),
      );
      expect(config.baseUrl).toBe('https://app.example.test');
      expect(config.trustedOrigins).toEqual([
        'https://app.example.test',
        `https://${branch}`,
        `https://${deployment}`,
      ]);
    });

    it.each(['production', undefined])(
      'does not fall back outside preview (VERCEL_ENV=%s)',
      (vercelEnv) => {
        expect(() =>
          readAuthConfig(
            env({
              NODE_ENV: NODE_ENV.Production,
              VERCEL_ENV: vercelEnv,
              VERCEL_BRANCH_URL: branch,
              VERCEL_URL: deployment,
            }),
          ),
        ).toThrow(/BETTER_AUTH_URL is required in production/);
      },
    );

    it.each(['evil.test/path', 'user@evil.test', 'evil.test/', 'a b.test'])(
      'rejects a malicious VERCEL_BRANCH_URL (%j)',
      (value) => {
        expect(() => readAuthConfig(env({ ...PREVIEW, VERCEL_BRANCH_URL: value }))).toThrow(
          /VERCEL_BRANCH_URL/,
        );
      },
    );

    it('rejects a malicious VERCEL_URL', () => {
      expect(() => readAuthConfig(env({ ...PREVIEW, VERCEL_URL: 'evil.test:99/x' }))).toThrow(
        /VERCEL_URL/,
      );
    });
  });
});
