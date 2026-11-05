# 0011. PostgreSQL on Neon with Prisma

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 5.3, 5.7, 5.8, 6.1, 9.1, 9.5

## Context

Data is relational (users → folders → links ↔ tags, PROJECT.md 6.1), folders nest, and the app needs title search and duplicate detection. Stage 1 must run free of charge (5.7). Better Auth stores users and sessions in our own database (5.4).

## Decision

- **PostgreSQL** as the only data store; it covers storage, nested folders and search without extra services:
  - nested folders — `parentId` + recursive CTE;
  - title search — built-in `pg_trgm` / full-text search;
  - duplicates — non-unique index on user + normalized URL.
- **Prisma** as ORM, **Prisma Migrate** for schema migrations. Only parameterised queries; `$queryRawUnsafe` is forbidden (5.8).
- **Neon (Free tier)** as cloud database. Environments: preview deploys use a separate Neon branch, production uses the main branch; preview never touches production data (5.7, 5.8).
- **Local development**: PostgreSQL in Docker, `.env` only locally.
- **Timing**: stage 0 creates only the Neon project; Prisma, `docker-compose.yml` and migrations in CI come in stage 2 together with the Better Auth schema (9.1). On merge to `main`, Prisma migrations are applied to the production Neon database (9.5).
- **No Redis cache** in stage 1.

## Consequences

- One database to operate; search and tree queries stay in SQL.
- Free-tier limits apply (100 CU-hours per project per month).
- Every query on user data must filter by `userId` from the session ([0012](0012-better-auth-oauth.md), PROJECT.md 5.8).

## Alternatives considered

- **Separate search service or Redis cache** — not needed in stage 1 (PROJECT.md 5.3).
- PROJECT.md does not record other databases or ORMs as evaluated options.
