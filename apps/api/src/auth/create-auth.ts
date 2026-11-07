import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import type { AuthConfig } from '../config/models/auth-config.interface';
import type { PrismaClient } from '../generated/prisma/client';
import { logAuthError, logAuthMessage } from './auth-logger';
import { AUTH_BASE_PATH } from './models/auth-base-path.const';
import { AUTH_COOKIE_PREFIX } from './models/auth-cookie-prefix.const';
import { AUTH_SESSION_LIFETIME } from './models/auth-session-lifetime.const';
import { DISABLED_AUTH_PATHS } from './models/disabled-auth-path.const';
import { stripOAuthTokens } from './strip-oauth-tokens';
import { toAuthSessionResponse } from './to-auth-session-response';

const GET_SESSION_PATH = '/get-session';

/**
 * Builds the Better Auth instance for one Prisma client and one validated configuration. Never a
 * module-level singleton, so tests can inject the in-memory database. Never sets
 * `disableCSRFCheck`, `disableOriginCheck` or `skipStateCookieCheck`.
 */
export function createAuth(prisma: PrismaClient, config: AuthConfig) {
  const { google, github } = config.providers;
  return betterAuth({
    appName: 'Shelfmark',
    basePath: AUTH_BASE_PATH,
    baseURL: config.baseUrl,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    // Only the configured providers exist; the default scopes apply.
    socialProviders: {
      ...(google ? { google } : {}),
      ...(github ? { github } : {}),
    },
    // Sign in is OAuth only: no email and password, no verification mail.
    emailAndPassword: { enabled: false },
    user: {
      additionalFields: {
        // input: false = a client can never set it, not on sign-in and not through any route.
        isDemo: { type: 'boolean', input: false, defaultValue: false },
      },
    },
    session: {
      expiresIn: AUTH_SESSION_LIFETIME.ExpiresInSeconds,
      updateAge: AUTH_SESSION_LIFETIME.UpdateAgeSeconds,
      // No cookie cache: sign-out and revocation take effect on the next request.
      cookieCache: { enabled: false },
    },
    advanced: {
      // Ids come from the database (`uuid(7)` default), not from Better Auth.
      database: { generateId: false },
      // Explicit, not inferred from the URL: Secure + `__Secure-` prefix exactly in production.
      useSecureCookies: config.isProduction,
      cookiePrefix: AUTH_COOKIE_PREFIX,
    },
    telemetry: { enabled: false },
    onAPIError: { errorURL: `${config.baseUrl}/sign-in`, onError: logAuthError },
    disabledPaths: [...DISABLED_AUTH_PATHS],
    logger: { level: 'warn', log: (level, message) => logAuthMessage(level, message) },
    databaseHooks: {
      account: {
        create: { before: stripOAuthTokens },
        update: { before: stripOAuthTokens },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        // Only HTTP responses are filtered; server-side `auth.api.getSession` keeps the full data.
        if (ctx.path !== GET_SESSION_PATH || !ctx.request) {
          return;
        }
        return ctx.json(toAuthSessionResponse(ctx.context.returned));
      }),
    },
  });
}
