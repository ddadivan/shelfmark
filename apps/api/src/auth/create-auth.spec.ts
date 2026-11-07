import { randomBytes } from 'node:crypto';
import type { AuthConfig } from '../config/models/auth-config.interface';
import type { PrismaClient } from '../generated/prisma/client';
import { createAuth } from './create-auth';
import { DISABLED_AUTH_PATHS } from './models/disabled-auth-path.const';

// The adapter factory is lazy: nothing touches the (fake) client while options are inspected.
const prisma = {} as PrismaClient;

function config(overrides: Partial<AuthConfig> = {}): AuthConfig {
  return {
    secret: randomBytes(32).toString('hex'),
    baseUrl: 'https://app.example.test',
    trustedOrigins: ['https://app.example.test'],
    providers: {
      google: { clientId: 'gid', clientSecret: randomBytes(8).toString('hex') },
      github: { clientId: 'hid', clientSecret: randomBytes(8).toString('hex') },
    },
    isProduction: true,
    ...overrides,
  };
}

describe('createAuth options', () => {
  it('uses database ids, a closed isDemo field and no telemetry', () => {
    const { options } = createAuth(prisma, config());
    expect(options.advanced?.database?.generateId).toBe(false);
    expect(options.user?.additionalFields?.['isDemo']).toMatchObject({
      type: 'boolean',
      input: false,
      defaultValue: false,
    });
    expect(options.telemetry?.enabled).toBe(false);
    expect(options.emailAndPassword?.enabled).toBe(false);
  });

  it('never opts out of CSRF, origin or state checks', () => {
    const { options } = createAuth(prisma, config());
    const advanced: Record<string, unknown> = { ...options.advanced };
    expect(advanced['disableCSRFCheck']).toBeUndefined();
    expect(advanced['disableOriginCheck']).toBeUndefined();
    expect(JSON.stringify(options)).not.toMatch(/skipStateCookieCheck/);
  });

  it.each([true, false])('sets useSecureCookies to isProduction (%s)', (isProduction) => {
    const { options } = createAuth(prisma, config({ isProduction }));
    expect(options.advanced?.useSecureCookies).toBe(isProduction);
  });

  it('pins HttpOnly and SameSite=Lax cookie attributes', () => {
    const { options } = createAuth(prisma, config());
    expect(options.advanced?.defaultCookieAttributes).toEqual({ sameSite: 'lax', httpOnly: true });
  });

  it('uses 7 day sessions with a 1 day refresh and no cookie cache', () => {
    const { options } = createAuth(prisma, config());
    expect(options.session).toMatchObject({
      expiresIn: 604800,
      updateAge: 86400,
      cookieCache: { enabled: false },
    });
  });

  it('keeps IP tracking on so per-IP rate limiting stays active', () => {
    const { options } = createAuth(prisma, config());
    const advanced: Record<string, unknown> = { ...options.advanced };
    expect(advanced['ipAddress']).toBeUndefined();
  });

  it('registers only the configured providers', () => {
    const both = createAuth(prisma, config()).options.socialProviders;
    expect(Object.keys(both ?? {}).sort()).toEqual(['github', 'google']);
    const none = createAuth(prisma, config({ providers: {} })).options.socialProviders;
    expect(none).toEqual({});
  });

  it('disables every unused endpoint and keeps the four it needs', () => {
    const { options } = createAuth(prisma, config());
    expect(options.disabledPaths).toEqual([...DISABLED_AUTH_PATHS]);
    for (const used of ['/sign-in/social', '/callback/:id', '/get-session', '/sign-out']) {
      expect(options.disabledPaths).not.toContain(used);
    }
    for (const unused of ['/sign-up/email', '/update-user', '/link-social', '/list-sessions']) {
      expect(options.disabledPaths).toContain(unused);
    }
  });

  it('points API errors at the web sign-in page', () => {
    expect(createAuth(prisma, config()).options.onAPIError?.errorURL).toBe(
      'https://app.example.test/sign-in',
    );
  });
});
