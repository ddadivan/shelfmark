import { readAppConfig } from '../config/app-config';
import { VERCEL_ENV_VAR } from '../config/models/vercel-env.const';
import { VERCEL_ENVIRONMENT } from '../config/models/vercel-environment.const';

/**
 * Whether the API serves Swagger (`/api/docs`, `/api/docs-json`): in development, tests and Vercel
 * preview deployments, never on the production site (author, Nov 26: users never need it, and it
 * only maps the routes for a stranger). Fail-safe: a production build without `VERCEL_ENV` is off.
 */
export function apiDocsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!readAppConfig(env).isProduction) {
    return true;
  }
  return env[VERCEL_ENV_VAR.Environment] === VERCEL_ENVIRONMENT.Preview;
}
