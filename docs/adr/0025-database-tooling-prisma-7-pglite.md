# 0025. Database tooling: Prisma 7 + PGlite

- Status: Accepted
- Date: 2026-11-07
- Source: issue #63; `docs/PROJECT.md` 5.3, 5.7, 9.1; amends [0011](0011-postgresql-neon-prisma.md), [0019](0019-vercel-deployment-architecture.md) and [0020](0020-npm-install-scripts-policy.md)

## Context

Stage 2 needs the database layer for Better Auth (users, sessions, accounts) before any feature. ADR 0011 planned a local PostgreSQL in Docker with `docker-compose.yml`. Requirements: free of charge (5.7), a contributor without Docker can run the API and the tests, migrations are verified on every PR, the Vercel function stays small and cold starts do not wait for the database, and install scripts stay denied (ADR 0020).

## Decision

- **Prisma 7.10.1** with the `prisma-client` generator (`output = ../src/generated/prisma`, ESM, `nodejs` runtime) and `@prisma/adapter-pg` (`pg` driver, no native query engine). The generated client is git-ignored and built by the Nx target `prisma-generate`, a dependency of `build`, `typecheck`, `lint` and `test`. Application code imports `PrismaService`, never `@prisma/client` directly.
- **Lazy connect**: `PrismaService` opens connections on the first query, so bootstrap and `/api/health` never touch the database. `PrismaModule` validates `DATABASE_URL` at boot (errors name the variable, never the value) and is imported by `AppModule` when the first feature needs it (Better Auth, issue #64).
- **Local development and tests: PGlite** (embedded Postgres, WASM) behind `@electric-sql/pglite-socket` on `127.0.0.1`, no Docker. `nx serve api` and `nx run api:db-migrate` start it through `apps/api/scripts/local-db.mjs`, which also starts an in-memory shadow database for `prisma migrate dev` and overrides `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `SHADOW_DATABASE_URL`, so a real URL can never be used by accident. Every test file that needs data creates its own in-memory PGlite with all migrations applied (`apps/api/test-utils/test-database.ts`).
- **Migrations are checked against real Postgres in CI**: the `lint-test-build` job runs a `postgres:17-alpine` service and `nx run api:db-check` (`prisma migrate deploy`, then `prisma migrate diff --exit-code` against `schema.prisma`). PGlite is for speed; CI proves the SQL on the production engine.
- **Migrations are applied in the Vercel build**: `buildCommand` ends with `nx run api:migrate-deploy`, which refuses to run unless `VERCEL=1` and `DATABASE_URL_UNPOOLED` is set (the direct Neon URL; the pooler has no session for migrations). Each deployment migrates its own Neon branch (preview or production).
- **Vercel bundle**: webpack keeps `@prisma/client/runtime/query_compiler_*` and `node:buffer` as real dynamic imports (`apps/api/esm-externals.plugin.js`), and `vercel.json` `includeFiles` ships the query compiler files. `api/index.mjs` imports `@prisma/adapter-pg` and `@prisma/client/runtime/client` so the tracer copies them. A build-gated spec asserts that no numbered async chunks are emitted.
- **Schema**: Better Auth core tables (`User` with `isDemo`, `Session`, `Account`, `Verification`), `uuid(7)` ids, `Timestamptz(3)`, snake_case table and column maps.
- **Install scripts** stay denied: `prisma` and `@prisma/engines` are added to `allowScripts` as `false` (ADR 0020). The CLI downloads its schema engine on first use, which needs network access.

## Consequences

- No Docker anywhere: `npm ci` and `npx nx serve api` are enough locally. `docker-compose.yml` is not created; ADR 0011 and PROJECT.md 5.3, 5.7, 9.1 are updated.
- PGlite is single-connection Postgres in WASM: no extensions beyond its bundled ones and slightly different performance. Anything that depends on engine behaviour (`pg_trgm` search, later) must also be covered by the CI Postgres check; revisit if a test needs a feature PGlite lacks.
- Each test file boots its own PGlite (about 1 s), so database tests are kept in few files.
- The first `prisma` command on a machine needs network access to fetch the schema engine.
- A deployment fails when a migration fails, so a bad migration never serves traffic with an old schema.

## Alternatives considered

- **Docker Compose PostgreSQL (ADR 0011)** — requires Docker Desktop for every contributor and every agent session.
- **Testcontainers** — same Docker dependency, slower per test file.
- **SQLite for tests** — different SQL dialect; migrations written for Postgres would not run.
- **Neon branch per test run** — needs network and secrets in CI for every PR.
- **Prisma Migrate in a GitHub Action on merge** — a second place that holds the production URL; the Vercel build already has it per deployment.
