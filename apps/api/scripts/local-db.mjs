// Local Postgres without Docker: PGlite (embedded Postgres) behind a socket server on 127.0.0.1.
// Usage: node scripts/local-db.mjs [--memory] [--shadow] -- <command> [args...]
// Starts the database (data in tmp/pglite/api, or in memory with --memory), runs the command with
// DATABASE_URL and DATABASE_URL_UNPOOLED pointing at it (overriding the environment, so a real
// URL can never be used by accident), then stops everything and exits with the command's exit
// code. With --shadow an in-memory shadow database is started too (SHADOW_DATABASE_URL, needed by
// `prisma migrate dev`). The persistent data directory is locked by a pid file: one process at a
// time. Do not use `pglite-server --run`: it hangs on shutdown.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

export const LOOPBACK_HOST = '127.0.0.1';
export const MEMORY_FLAG = '--memory';
export const SHADOW_FLAG = '--shadow';
export const SEPARATOR = '--';
export const LOCK_FILE = '.lock';
const MAX_CONNECTIONS = 20;
const DATA_DIR = join(import.meta.dirname, '..', '..', '..', 'tmp', 'pglite', 'api');

export function parseArgs(argv) {
  const separator = argv.indexOf(SEPARATOR);
  const flags = separator === -1 ? argv : argv.slice(0, separator);
  const command = separator === -1 ? [] : argv.slice(separator + 1);
  return { memory: flags.includes(MEMORY_FLAG), shadow: flags.includes(SHADOW_FLAG), command };
}

export function databaseUrl(connection) {
  return `postgresql://postgres@${connection}/postgres`;
}

export function buildDatabaseEnv(url, shadowUrl) {
  const env = { DATABASE_URL: url, DATABASE_URL_UNPOOLED: url };
  return shadowUrl ? { ...env, SHADOW_DATABASE_URL: shadowUrl } : env;
}

export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

/**
 * Takes the pid lock of a data directory. Returns a release function, or throws when a live
 * process holds it. A lock of a dead process is replaced.
 */
export function acquireLock(dataDir, alive = isProcessAlive, pid = process.pid) {
  const file = join(dataDir, LOCK_FILE);
  let holder;
  try {
    holder = Number.parseInt(readFileSync(file, 'utf8'), 10);
  } catch {
    holder = undefined;
  }
  if (holder && holder !== pid && alive(holder)) {
    throw new Error(
      `The local database in ${dataDir} is in use by process ${holder}; stop it first.`,
    );
  }
  writeFileSync(file, String(pid));
  return () => rmSync(file, { force: true });
}

async function startDatabase(dataDir) {
  // pg_trgm is loaded for the search of #71; it is harmless until `CREATE EXTENSION` runs.
  const db = await PGlite.create({ dataDir, extensions: { pg_trgm } });
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

function runCommand(command, env, isStopping) {
  if (isStopping()) {
    return Promise.resolve(130);
  }
  const child = spawn(command[0], command.slice(1), { stdio: 'inherit', env });
  const forward = (signal) => child.kill(signal);
  process.on('SIGINT', forward);
  process.on('SIGTERM', forward);
  return new Promise((resolve) => {
    child.on('error', () => resolve(1));
    child.on('exit', (exitCode, signal) => resolve(exitCode ?? (signal ? 130 : 1)));
  }).finally(() => {
    process.off('SIGINT', forward);
    process.off('SIGTERM', forward);
  });
}

export async function runWithLocalDb(argv) {
  const { memory, shadow, command } = parseArgs(argv);
  if (command.length === 0) {
    console.error('Usage: local-db.mjs [--memory] [--shadow] -- <command> [args...]');
    return 2;
  }
  // Signals during the (slow) boot must not leave databases or the lock behind.
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  const started = [];
  let release = () => undefined;
  let code;
  try {
    let dataDir;
    if (!memory) {
      mkdirSync(DATA_DIR, { recursive: true });
      release = acquireLock(DATA_DIR);
      dataDir = DATA_DIR;
    }
    const main = await startDatabase(dataDir);
    started.push(main);
    const shadowDb = shadow ? await startDatabase() : undefined;
    if (shadowDb) {
      started.push(shadowDb);
    }
    const env = { ...process.env, ...buildDatabaseEnv(main.url, shadowDb?.url) };
    if (!shadowDb) {
      delete env['SHADOW_DATABASE_URL'];
    }
    code = await runCommand(command, env, () => stopping);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Local database failed to start.');
    code = 1;
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    // Stop every database even when one fails; the command's exit code is preserved.
    await Promise.allSettled(started.reverse().map(stopDatabase));
    release();
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await runWithLocalDb(process.argv.slice(2)));
}
