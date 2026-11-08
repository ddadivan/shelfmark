import { defineConfig } from 'prisma/config';

// Prisma CLI configuration. The URLs come from the process environment only (never from a
// file): `scripts/local-db.mjs` sets them for local work, Vercel and CI set them for deploys.
// Migrations use the unpooled (direct) URL when present, the runtime uses DATABASE_URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL'] ?? '',
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});
