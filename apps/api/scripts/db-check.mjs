// Migration check: applies every migration to the database in the environment, then fails when
// the result differs from schema.prisma (a schema change without a migration).
// CI runs this script against its Postgres service; `nx run api:db-check` is the local
// equivalent against an in-memory PGlite. Outside CI it refuses a non-loopback database, so an
// exported real URL is never migrated by accident.
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

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];
const URL_VARIABLES = ['DATABASE_URL_UNPOOLED', 'DATABASE_URL'];

/** Returns a refusal message, or undefined when the target database may be checked. */
export function refusal(env) {
  if (env['CI']) {
    return undefined;
  }
  const value = URL_VARIABLES.map((name) => env[name]).find(Boolean);
  let host;
  try {
    host = new URL(value ?? '').hostname;
  } catch {
    return 'db-check needs DATABASE_URL (use `nx run api:db-check` for a local database); refusing.';
  }
  return LOOPBACK_HOSTS.includes(host)
    ? undefined
    : 'db-check outside CI only runs against a loopback database; refusing.';
}

export function dbCheck(run = runPrisma, env = process.env) {
  const message = refusal(env);
  if (message) {
    console.error(message);
    return 1;
  }
  const deployCode = run(['migrate', 'deploy']);
  if (deployCode !== 0) {
    return deployCode;
  }
  return run(DRIFT_ARGS);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(dbCheck());
}
