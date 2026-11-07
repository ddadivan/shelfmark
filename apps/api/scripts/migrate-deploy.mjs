// Applies pending migrations during the Vercel build, once per deployment (Neon branch).
// It never runs anywhere else, so a local or CI shell can not migrate a real database by
// accident: it needs VERCEL=1 and a production build of `main` or a preview build. The URL is
// read from the environment and never printed by this script; Prisma's own errors may show the
// host, port and user (never the password) in the build log.
import { pathToFileURL } from 'node:url';
import { runPrisma } from './prisma-cli.mjs';

export const VERCEL_FLAG = '1';
export const DIRECT_URL_VARIABLE = 'DATABASE_URL_UNPOOLED';
export const VERCEL_ENV = { Production: 'production', Preview: 'preview' };
export const PRODUCTION_BRANCH = 'main';

function refusal(env) {
  if (env['VERCEL'] !== VERCEL_FLAG) {
    return 'migrate-deploy runs only in the Vercel build (VERCEL=1); refusing.';
  }
  const target = env['VERCEL_ENV'];
  if (target === VERCEL_ENV.Production) {
    if (env['VERCEL_GIT_COMMIT_REF'] !== PRODUCTION_BRANCH) {
      return `Production migrations run only for branch ${PRODUCTION_BRANCH}; refusing.`;
    }
  } else if (target !== VERCEL_ENV.Preview) {
    return 'migrate-deploy runs only for VERCEL_ENV production or preview; refusing.';
  }
  if (!env[DIRECT_URL_VARIABLE]) {
    return `${DIRECT_URL_VARIABLE} is not set for this build; enable it for Production and Preview.`;
  }
  return undefined;
}

/**
 * Returns `{ code, message? }`; `code` 0 means the migrations were applied.
 */
export function migrateDeploy(env = process.env, run = runPrisma) {
  const message = refusal(env);
  if (message) {
    return { code: 1, message };
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
