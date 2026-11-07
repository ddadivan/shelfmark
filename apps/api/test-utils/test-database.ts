import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { PrismaService } from '../src/prisma/prisma.service';
import type { TestDatabase } from './models/test-database.interface';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'prisma', 'migrations');
const MAX_CONNECTIONS = 20;
const LOOPBACK_HOST = '127.0.0.1';

/** Every table of the public schema except Prisma's own bookkeeping table. */
const TABLES_QUERY = `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;

/** Migration folders in apply order (names start with a timestamp). */
export function migrationFiles(dir: string = MIGRATIONS_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => join(dir, name, 'migration.sql'));
}

/**
 * One in-memory PGlite per test file with all migrations applied, served on a random loopback
 * port and used through the same `PrismaService` as production. No Docker, no network.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  // pg_trgm is loaded for the search of #71; it is harmless until `CREATE EXTENSION` runs.
  const db = await PGlite.create({ extensions: { pg_trgm } });
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(file, 'utf8'));
  }
  const server = new PGLiteSocketServer({
    db,
    host: LOOPBACK_HOST,
    port: 0,
    maxConnections: MAX_CONNECTIONS,
  });
  await server.start();
  const url = `postgresql://postgres@${server.getServerConn()}/postgres`;
  const prisma = new PrismaService(url);

  return {
    url,
    prisma,
    async truncateAll() {
      const { rows } = await db.query<{ tablename: string }>(TABLES_QUERY);
      if (rows.length > 0) {
        const names = rows.map((row) => `"${row.tablename}"`).join(', ');
        await db.exec(`TRUNCATE TABLE ${names} CASCADE`);
      }
    },
    async close() {
      await prisma.$disconnect();
      await server.stop();
      await db.close();
    },
  };
}
