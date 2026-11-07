// Local Postgres without Docker: PGlite (embedded Postgres) behind a socket server on 127.0.0.1.
// Usage: node scripts/local-db.mjs [--memory] -- <command> [args...]
// Starts the database (data in tmp/pglite/api, or in memory with --memory), starts an in-memory
// shadow database for `prisma migrate dev`, runs the command with DATABASE_URL,
// DATABASE_URL_UNPOOLED and SHADOW_DATABASE_URL pointing at them (overriding the environment,
// so a real URL can never be used by accident), then stops everything and exits with the
// command's exit code. Do not use `pglite-server --run`: it hangs on shutdown.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

export const LOOPBACK_HOST = '127.0.0.1';
export const MEMORY_FLAG = '--memory';
export const SEPARATOR = '--';
const MAX_CONNECTIONS = 20;
const DATA_DIR = join(import.meta.dirname, '..', '..', '..', 'tmp', 'pglite', 'api');

export function parseArgs(argv) {
  const separator = argv.indexOf(SEPARATOR);
  const flags = separator === -1 ? argv : argv.slice(0, separator);
  const command = separator === -1 ? [] : argv.slice(separator + 1);
  return { memory: flags.includes(MEMORY_FLAG), command };
}

export function databaseUrl(connection) {
  return `postgresql://postgres@${connection}/postgres`;
}

export function buildDatabaseEnv(url, shadowUrl) {
  return { DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, SHADOW_DATABASE_URL: shadowUrl };
}

async function startDatabase(dataDir) {
  const db = await PGlite.create(dataDir);
  const server = new PGLiteSocketServer({
    db,
    host: LOOPBACK_HOST,
    port: 0,
    maxConnections: MAX_CONNECTIONS,
  });
  await server.start();
  return { db, server, url: databaseUrl(server.getServerConn()) };
}

async function stopDatabase({ db, server }) {
  await server.stop();
  await db.close();
}

export async function runWithLocalDb(argv) {
  const { memory, command } = parseArgs(argv);
  if (command.length === 0) {
    console.error('Usage: local-db.mjs [--memory] -- <command> [args...]');
    return 2;
  }
  let dataDir;
  if (!memory) {
    mkdirSync(DATA_DIR, { recursive: true });
    dataDir = DATA_DIR;
  }
  const main = await startDatabase(dataDir);
  const shadow = await startDatabase();
  let code;
  try {
    const child = spawn(command[0], command.slice(1), {
      stdio: 'inherit',
      env: { ...process.env, ...buildDatabaseEnv(main.url, shadow.url) },
    });
    const forward = (signal) => child.kill(signal);
    process.on('SIGINT', forward);
    process.on('SIGTERM', forward);
    code = await new Promise((resolve) => {
      child.on('error', () => resolve(1));
      child.on('exit', (exitCode, signal) => resolve(exitCode ?? (signal ? 130 : 1)));
    });
    process.off('SIGINT', forward);
    process.off('SIGTERM', forward);
  } finally {
    await stopDatabase(shadow);
    await stopDatabase(main);
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await runWithLocalDb(process.argv.slice(2)));
}
