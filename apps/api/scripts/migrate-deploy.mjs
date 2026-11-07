// Applies pending migrations during the Vercel build, once per deployment (Neon branch).
// It never runs anywhere else, so a local or CI shell can not migrate a real database by
// accident. The URL is read from the environment and never printed.
import { pathToFileURL } from 'node:url';
import { runPrisma } from './prisma-cli.mjs';

export const VERCEL_FLAG = '1';
export const DIRECT_URL_VARIABLE = 'DATABASE_URL_UNPOOLED';

/**
 * Returns `{ code, message? }`; `code` 0 means the migrations were applied.
 */
export function migrateDeploy(env = process.env, run = runPrisma) {
  if (env['VERCEL'] !== VERCEL_FLAG) {
    return {
      code: 1,
      message: 'migrate-deploy runs only in the Vercel build (VERCEL=1); refusing.',
    };
  }
  if (!env[DIRECT_URL_VARIABLE]) {
    return {
      code: 1,
      message: `${DIRECT_URL_VARIABLE} is not set for this build; enable it for Production and Preview.`,
    };
  }
  return { code: run(['migrate', 'deploy'], env) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { code, message } = migrateDeploy();
  if (message) {
    console.error(message);
  }
  process.exit(code);
}
