import { AUTH_DEFAULT_SECRET } from './models/auth-default-secret.const';
import { AUTH_DEV_BASE_URL } from './models/auth-dev-base-url.const';
import { AUTH_TEST_FLAG } from './models/auth-test-flag.const';
import { AUTH_ENV } from './models/auth-env.const';
import { VERCEL_ENV_VAR } from './models/vercel-env.const';
import { VERCEL_ENVIRONMENT } from './models/vercel-environment.const';
import { AUTH_SECRET_MIN_LENGTH } from './models/auth-secret-min-length.const';
import type { AuthConfig } from './models/auth-config.interface';
import type { AuthProviderCredentials } from './models/auth-provider-credentials.interface';
import { readAppConfig } from './app-config';

function readVar(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name];
  return value === undefined || value === '' ? undefined : value;
}

/** Parses an origin (scheme, host, port; no path, query or userinfo). The value is never echoed. */
function parseOrigin(name: string, value: string, requireHttps: boolean): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid configuration: ${name} must be a valid origin`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Invalid configuration: ${name} must use http or https`);
  }
  if (requireHttps && url.protocol !== 'https:') {
    throw new Error(`Invalid configuration: ${name} must use https in production`);
  }
  if (
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    value.endsWith('/')
  ) {
    throw new Error(
      `Invalid configuration: ${name} must be an origin only (scheme, host, port, no path or trailing slash)`,
    );
  }
  return url.origin;
}

/** Vercel exposes hostnames without a scheme; they are validated as https origins. */
function readVercelOrigin(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const host = readVar(env, name);
  return host === undefined ? undefined : parseOrigin(name, `https://${host}`, true);
}

function readProvider(
  env: NodeJS.ProcessEnv,
  idName: string,
  secretName: string,
): AuthProviderCredentials | undefined {
  const clientId = readVar(env, idName);
  const clientSecret = readVar(env, secretName);
  if (clientId === undefined && clientSecret === undefined) {
    return undefined;
  }
  if (clientId === undefined || clientSecret === undefined) {
    throw new Error(`Invalid configuration: ${idName} and ${secretName} must be set together`);
  }
  return { clientId, clientSecret };
}

/**
 * Reads and validates the Better Auth settings at boot. Errors name the variable only, never the
 * value (secrets, client secrets). Never loads dotenv-style files.
 * - `BETTER_AUTH_SECRET` is always required (an ephemeral secret would sign everyone out on restart).
 * - `BETTER_AUTH_URL` is required in production (previews included) and must be https there; outside
 *   production it defaults to the web dev server.
 * - On Vercel preview deployments only (`VERCEL_ENV=preview`), an unset `BETTER_AUTH_URL` falls back to
 *   `VERCEL_BRANCH_URL`, then `VERCEL_URL` (every preview has its own origin, ADR 0026), and both
 *   hostnames are trusted origins. Production never falls back.
 * - `TEST` must not be set in production (it disables Better Auth's CSRF and origin checks).
 * - Provider variables come in pairs. Outside production a missing pair means the provider is not
 *   registered; production (not previews) requires both providers (ADR 0026).
 */
export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const { isProduction } = readAppConfig(env);

  // Better Auth treats a truthy TEST like NODE_ENV=test and skips its origin and CSRF checks.
  if (isProduction && readVar(env, AUTH_TEST_FLAG) !== undefined) {
    throw new Error(`Invalid configuration: ${AUTH_TEST_FLAG} must not be set in production`);
  }

  const secret = readVar(env, AUTH_ENV.Secret);
  if (secret === undefined) {
    throw new Error(`Invalid configuration: ${AUTH_ENV.Secret} is required`);
  }
  if (secret.length < AUTH_SECRET_MIN_LENGTH) {
    throw new Error(
      `Invalid configuration: ${AUTH_ENV.Secret} must be at least ${AUTH_SECRET_MIN_LENGTH} characters`,
    );
  }
  if (secret === AUTH_DEFAULT_SECRET) {
    throw new Error(`Invalid configuration: ${AUTH_ENV.Secret} must not be the default secret`);
  }

  const isPreview =
    isProduction && readVar(env, VERCEL_ENV_VAR.Environment) === VERCEL_ENVIRONMENT.Preview;
  const previewOrigins = isPreview
    ? [
        readVercelOrigin(env, VERCEL_ENV_VAR.BranchUrl),
        readVercelOrigin(env, VERCEL_ENV_VAR.Url),
      ].filter((origin): origin is string => origin !== undefined)
    : [];

  const rawUrl = readVar(env, AUTH_ENV.Url);
  if (rawUrl === undefined && isProduction && previewOrigins.length === 0) {
    throw new Error(`Invalid configuration: ${AUTH_ENV.Url} is required in production`);
  }
  const baseUrl =
    rawUrl === undefined && isProduction
      ? previewOrigins[0]
      : parseOrigin(AUTH_ENV.Url, rawUrl ?? AUTH_DEV_BASE_URL, isProduction);

  const trustedOrigins = new Set<string>([baseUrl, ...previewOrigins]);
  const rawTrusted = readVar(env, AUTH_ENV.TrustedOrigins);
  if (rawTrusted !== undefined) {
    for (const entry of rawTrusted.split(',')) {
      const trimmed = entry.trim();
      if (trimmed === '') {
        continue;
      }
      if (trimmed.includes('*')) {
        throw new Error(
          `Invalid configuration: ${AUTH_ENV.TrustedOrigins} must not contain wildcards`,
        );
      }
      trustedOrigins.add(parseOrigin(AUTH_ENV.TrustedOrigins, trimmed, isProduction));
    }
  }

  const providers = {
    google: readProvider(env, AUTH_ENV.GoogleClientId, AUTH_ENV.GoogleClientSecret),
    github: readProvider(env, AUTH_ENV.GitHubClientId, AUTH_ENV.GitHubClientSecret),
  };
  // ADR 0026: production must not silently lose a sign-in method. Previews run demo-only.
  if (isProduction && !isPreview) {
    if (!providers.google) {
      throw new Error(
        `Invalid configuration: ${AUTH_ENV.GoogleClientId} and ${AUTH_ENV.GoogleClientSecret} are required in production`,
      );
    }
    if (!providers.github) {
      throw new Error(
        `Invalid configuration: ${AUTH_ENV.GitHubClientId} and ${AUTH_ENV.GitHubClientSecret} are required in production`,
      );
    }
  }
  return {
    secret,
    baseUrl,
    trustedOrigins: [...trustedOrigins],
    providers,
    isProduction,
  };
}
