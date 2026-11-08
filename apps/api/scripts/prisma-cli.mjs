import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const apiRoot = join(import.meta.dirname, '..');
const prismaEntry = join(dirname(require.resolve('prisma/package.json')), 'build', 'index.js');

/** Environment defaults that keep the CLI quiet and offline-friendly. */
export const PRISMA_ENV = { CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1' };

/**
 * Runs the Prisma CLI synchronously with the API project as the working directory.
 * Returns the exit code (1 when the process could not start or was killed).
 */
export function runPrisma(args, env = process.env) {
  const result = spawnSync(process.execPath, [prismaEntry, ...args], {
    cwd: apiRoot,
    env: { ...env, ...PRISMA_ENV },
    stdio: 'inherit',
  });
  return result.status ?? 1;
}
