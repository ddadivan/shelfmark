// Migration check: applies every migration to the database in the environment, then fails when
// the result differs from schema.prisma (a schema change without a migration).
// Run through `nx run api:db-check` (in-memory PGlite) or in CI against the Postgres service.
import { pathToFileURL } from 'node:url';
import { runPrisma } from './prisma-cli.mjs';

export const DRIFT_ARGS = [
  'migrate',
  'diff',
  '--from-config-datasource',
  '--to-schema',
  'prisma/schema.prisma',
  '--exit-code',
];

export function dbCheck(run = runPrisma) {
  const deployCode = run(['migrate', 'deploy']);
  if (deployCode !== 0) {
    return deployCode;
  }
  return run(DRIFT_ARGS);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(dbCheck());
}
