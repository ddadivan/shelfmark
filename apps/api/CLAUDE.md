# apps/api

NestJS REST API, mounted under `/api` (port 3000). Source of truth: `docs/PROJECT.md` 5.2–5.4, 5.8 and 6.

## Stack

- NestJS 12 (`@nestjs/common|core|platform-express` 12.3.3, ESM-only), Express, `@nestjs/swagger` 12, `class-validator` + `class-transformer`, `helmet`.
- Build: webpack (`webpack-cli build`, tsc loader, ESM output, all dependencies external) into `dist/apps/api` (`main.mjs`, `vercel-handler.mjs`; `.mjs` so the module type is never guessed). No esbuild: it does not emit decorator metadata, which Nest DI needs. No `@nx/nest` (no Nest 12 support), no `@nx/node`, no `@nestjs/cli`, no `@nestjs/config`.
- `@nx/webpack` 24 has no `webpack` executor, so `build` and `serve` are `nx:run-commands` around `webpack-cli`.
- Database: Prisma 7 (`prisma-client` generator, ESM, output `src/generated/prisma`, git-ignored, built by the cached `prisma-generate` target) with the `pg` driver adapter (`@prisma/adapter-pg`); no native engine at runtime. Local dev and tests use embedded Postgres (PGlite) instead of Docker (ADR 0025). Prisma's install scripts are denied (ADR 0020): the CLI downloads its schema engine on first use.
- Tests: Vitest with SWC (`unplugin-swc`, Vite's own TS transform disabled with `oxc: false`) so decorator metadata works. Supertest on `createApp()`.

## Layout

- `src/main.ts` - bootstrap and `listen` only.
- `src/vercel-handler.ts` - second webpack entry (`vercel-handler.mjs`): Vercel Function handler, one Nest app per instance (`createApp()` + `init()`, no `listen`), cached promise reset on failure. Re-exported by the root `api/index.mjs` (ADR 0019).
- `src/app/create-app.ts` - `NestFactory` (explicit `ExpressAdapter`) + `configureApp`; reused by `main.ts`, the Vercel handler and tests.
- `src/app/configure-app.ts` - request id, helmet, 100kb JSON limit, `/api` prefix, global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform), `AllExceptionsFilter`, Swagger at `/api/docs` (public in every environment, by decision).
- `src/config/` - typed readers for `PORT`, `NODE_ENV`, `DATABASE_URL` and the Better Auth variables (`readAuthConfig`), validated at boot; errors name the variable and never echo a value. Never loads `.env` files.
- `src/prisma/` - global `PrismaModule` and `PrismaService` (lazy connect: boot and `/api/health` never touch the database). Imported by `AppModule` (auth needs it), so boot validates `DATABASE_URL`.
- `prisma/` - `schema.prisma` and `migrations/` (checked in); `prisma.config.ts` reads the URLs from the environment only.
- `scripts/` - `local-db.mjs` (PGlite + socket server, runs a command with the database URLs set), `db-check.mjs`, `migrate-deploy.mjs` (Vercel build only: production of `main` or preview). The persistent data dir `tmp/pglite/api` is locked by a pid file (`.lock`): one process at a time; the shadow database starts only with `--shadow`.
- `test-utils/test-database.ts` - per test file in-memory PGlite with all migrations applied (`createTestDatabase()`, `truncateAll()`, `close()`).
- `test-utils/auth-test-app.ts`, `oauth-provider-stub.ts`, `sign-in-as.ts` - auth harness: `createAuthTestApp()` boots `AppModule` on PGlite with per-run random secrets; `stubOAuthProviders()` fakes GitHub/Google on `globalThis.fetch` (any other URL throws); `signInAs(app, baseUrl, { email, name, provider? })` drives the real flow and returns `{ userId, cookie }`: call it twice for the two users of a data-isolation test.
- `src/auth/` - Better Auth on `/api/auth/*` (ADR 0027): `auth.module.ts` (community Nest integration, no CORS, our JSON parser, no global guard until #65), `create-auth.ts` (factory from `AuthConfig` + the Prisma client), `strip-oauth-tokens.ts` (provider tokens are never stored), `to-auth-session-response.ts` (HTTP `get-session` returns only the contract), `auth-logger.ts` (message only), `models/disabled-auth-path.const.ts` (everything but sign-in/social, callback, get-session, sign-out is 404). Auth responses bypass `ValidationPipe` and `AllExceptionsFilter`: errors there are Better Auth's `{ code, message }`, not `ApiError`.
- `src/common/` - cross-cutting pieces (request id, error filter, `@AllowAnonymous`).
- `src/<domain>/` - one module per domain (`auth`, `users`, `links`, `folders`, `tags`, `metadata`, ...) with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

## Rules

- Contract first: request/response shapes live in `libs/shared/contracts` (`@shelfmark/contracts`). A DTO class `implements` the contract interface and carries validation + `@ApiProperty`.
- Contracts: `import type` for shapes. A runtime import (`AUTH_PROVIDER`, `AUTH_ENDPOINT`) works because `webpack.config.js` and `vitest.config.mts` alias `@shelfmark/contracts` to the lib source.
- Controllers are thin; logic lives in services.
- Never use `import type` for injectables (controller/service constructor parameters): it erases decorator metadata and breaks DI.
- From stage 2 every query on user data filters by `userId` from the session; a foreign or missing object is 404, never 403. Every user-owned resource gets a data-isolation test.
- Errors always use `ApiError` (`{ statusCode, error, message, requestId }`), no stack traces. Validation errors have `message: string[]`.
- `@AllowAnonymous()` must be justified in the PR description and in a comment at the use site. It is a NO-OP until the global AuthGuard (#65) exists; all non-auth routes are currently public.
- `NODE_ENV` is fail-safe: only an explicit `development` or `test` is non-production (unset means production). Non-production drops HSTS and `upgrade-insecure-requests` from helmet; `nx serve` sets `NODE_ENV=development`.
- 5xx responses never carry internal messages (generic text); the cause and stack are logged server-side only.
- No CORS: the API is same-origin (web dev proxy `/api` -> `http://localhost:3000`).
- Strict TypeScript: no `any`, no `@ts-ignore`; one interface/type/const per file with the `.interface.ts` / `.type.ts` / `.const.ts` suffix; no TS `enum` (ADR 0024).

## Security

- Never read or create `.env*` files; configuration comes from the platform environment.
- Auth: never set Better Auth's `disableCSRFCheck`, `disableOriginCheck` or `skipStateCookieCheck`; it skips those checks under `NODE_ENV=test` or a truthy `TEST`, so `vitest.setup.ts` runs specs as `development` without `TEST` and `readAuthConfig` refuses `TEST` in production. Cookies are `SameSite=Lax` (the OAuth callback is a cross-site top-level GET), `Secure` + `__Secure-` exactly when `isProduction`. Never log Better Auth's extra logger arguments (they can hold tokens).
- Never log secrets, tokens, request bodies or personal data. The error filter logs only method, path, status and request id.
- Outbound HTTP (link previews) only through the SSRF-safe fetcher (http/https, private IPs blocked after DNS resolve, timeout, size and redirect limits, no cookies).
- Prisma with parameterised queries only; never `$queryRawUnsafe` / `$executeRawUnsafe` (ESLint forbids both).
- Never read, print or set real database URLs; `local-db.mjs` overrides them with its own loopback URLs.

## Database rules

- Conventions: PascalCase model with `@@map` to a snake_case plural table, camelCase fields with `@map` to snake_case columns, `@default(uuid(7)) @db.Uuid` ids, `@db.Timestamptz(3)` timestamps.
- Never edit an applied migration; add a new one. Destructive changes follow expand-then-contract across deploys (add, backfill and dual-write, switch reads, then drop).
- Migrations are created locally with `nx run api:db-migrate -- --name <name>`, applied in the Vercel build (`api:migrate-deploy`, only when `VERCEL=1`), and verified in CI: CI runs `scripts/db-check.mjs` (deploy plus drift check) against the Postgres service, and `nx run api:db-check` is the local PGlite equivalent.
- Never run `migrate reset` against a non-local database.

## Commands

```bash
npx nx serve api                  # http://localhost:3000/api (Swagger: /api/docs), with a local PGlite database (data in tmp/pglite/api)
# serve cold start: a production build runs first (dependsOn build), then the webpack
# watch rebuilds and node --watch restarts the server on each change.
npx nx build api                  # dist/apps/api, run with: node dist/apps/api/main.mjs
npx nx run api:prisma-generate    # regenerate the client (cached; build, typecheck, lint and test depend on it)
npx nx run api:db-migrate -- --name <name>   # create and apply a migration on the local database
npx nx run api:db-check           # apply all migrations to a fresh in-memory database and fail on schema drift
npx nx test api                   # Vitest, coverage on by default, thresholds 80%
npx nx run-many -t lint typecheck test build -p api contracts
```

## Testing conventions

- Specs sit next to the code (`*.spec.ts`).
- Integration tests build the app with `createApp()` (or `Test.createTestingModule` + `configureApp`) and call it with Supertest; close the app in `afterAll`.
- Unit-test pure helpers and filters directly; no network, no real database in unit tests. Database tests use `createTestDatabase()` (in-memory PGlite, no Docker); every user-owned resource needs a data-isolation test against it.
