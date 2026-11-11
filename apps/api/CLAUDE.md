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
- `src/monitoring/` - Sentry (ADR 0032): `initMonitoring` (no-op without `SENTRY_DSN`, minimal integrations, `scrubEvent` as `beforeSend`), `reportException` (called by the error filter for 5xx), `GET /api/monitoring/config` and `POST /api/monitoring/tunnel` (envelope must name our own DSN, 64 KiB limit, no cookies upstream). Web scrubber twin: `apps/web/src/app/core/monitoring/scrub-event.ts`, keep in sync.
- `src/config/` - typed readers for `PORT`, `NODE_ENV`, `DATABASE_URL` and the Better Auth variables (`readAuthConfig`), validated at boot; errors name the variable and never echo a value. Never loads `.env` files.
- `src/prisma/` - global `PrismaModule` and `PrismaService` (lazy connect: boot and `/api/health` never touch the database). Imported by `AppModule` (auth needs it), so boot validates `DATABASE_URL`.
- `prisma/` - `schema.prisma` and `migrations/` (checked in); `prisma.config.ts` reads the URLs from the environment only.
- `scripts/` - `local-db.mjs` (PGlite + socket server, runs a command with the database URLs set), `db-check.mjs`, `migrate-deploy.mjs` (Vercel build only: production of `main` or preview). The persistent data dir `tmp/pglite/api` is locked by a pid file (`.lock`): one process at a time; the shadow database starts only with `--shadow`.
- `test-utils/test-database.ts` - per test file in-memory PGlite with all migrations applied (`createTestDatabase()`, `truncateAll()`, `close()`); served by `exchange-socket-server.ts`, not `PGLiteSocketServer` (that one queues single protocol messages, so parallel pooled connections interleave Parse/Bind/Execute on the one shared session and fail with P2039 / "Failed to get session"). Ours runs a whole exchange (up to Sync/Query) as a unit and keeps the session with one connection while its transaction is open. Never add test-level `retry` to hide such flakes.
- `test-utils/auth-test-app.ts`, `oauth-provider-stub.ts`, `sign-in-as.ts` - auth harness: `createAuthTestApp()` boots `AppModule` on PGlite with per-run random secrets; `stubOAuthProviders()` fakes GitHub/Google on `globalThis.fetch` (any other URL throws); `signInAs(app, baseUrl, { email, name, provider? })` drives the real flow and returns `{ userId, cookie }`: call it twice for the two users of a data-isolation test.
- `test-utils/isolation/` - data-isolation harness (ADR 0029): `createIsolationUsers`, `asUser` / `anonymous`, `expectIsolated`, plus test-only `NotesFixtureModule` and `LeakyNotesFixtureModule` (pass them as `createAuthTestApp({ imports })`, never into `AppModule`).
- `src/auth/` - Better Auth on `/api/auth/*` (ADR 0030): `auth.module.ts` (community Nest integration, no CORS, our JSON parser, its own guard off; `SessionAuthGuard` is registered as `APP_GUARD` in `AppModule` after the throttler and `CsrfGuard`), `session-auth.guard.ts` (public check first, read-only session lookup, 4xx to 401, ADR 0029), `create-auth.ts` (factory from `AuthConfig` + the Prisma client), `strip-oauth-tokens.ts` (provider tokens are never stored), `to-auth-session-response.ts` (HTTP `get-session` returns only the contract), `auth-logger.ts` (message only), `auth-allow-list.middleware.ts` + `models/allowed-auth-route.const.ts` (allow-list in `configureApp`: only POST sign-in/social, GET callback/{google,github}, GET get-session, POST sign-out reach Better Auth; everything else under `/api/auth` is 404) and `models/disabled-auth-path.const.ts` (second layer). Auth responses bypass `ValidationPipe` and `AllExceptionsFilter`: errors there are Better Auth's `{ code, message }`, not `ApiError`.
- `src/common/` - cross-cutting pieces (request id, error filter, `auth/`: `@AllowAnonymous`, `@CurrentUser()` in `current-user.decorator.ts`, `models/public-route.const.ts` = `PUBLIC_ROUTES`, the only allowed public routes; `scan-routes.ts` + `route-protection.spec.ts` enforce it).
- `src/common/rate-limit/` (`RATE_LIMIT` presets, `@RateLimit`, `clientIp`, auth middleware), `src/common/interceptors/` (`LoggingInterceptor`: method, route pattern, status, duration, request id only; `TimeoutInterceptor`: `REQUEST_TIMEOUT_MS` below the Vercel `maxDuration`, 504), `src/common/csrf/` (`CsrfGuard`: foreign `Origin` 403, non-JSON body 415 on unsafe methods; the one exemption from the 415 rule is exactly `POST /api/monitoring/tunnel`, `models/csrf-content-type-exempt-route.const.ts`, because Sentry sends text/plain).
- `src/<domain>/` - one module per domain (`auth`, `users`, `links`, `folders`, `tags`, `metadata`, ...) with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.
- `src/links/` (ADR 0033): `LinksService` (list, recent, get, preview), `LinksWriteService` (create, update, open, delete), `LinkPreviewService` (fetch through `SafeFetcherService`, one fallback for every failure), `link-where.ts` (shared filter builder: user, folder = direct children, unsorted, favorite, tags AND, search words AND over title, note and URL; the export reuses it), `common/util/escape-like.ts` (every search word and every insensitive tag-name match is escaped: Prisma emits `ILIKE` for both), `common/validation/` (control characters, NUL included, are a 400 in text fields), `link-cursor.ts` (keyset cursor `{v,s,o,k,id}`; a cursor for another sort or order is a 400). `faviconUrl` / `imageUrl` in responses are same-origin paths (`/api/links/:id/favicon|image?v=<hash>`) when an image was captured (or a capture is pending), else `null`; the remote source URLs are stored but never returned. Create is idempotent through `idempotencyKey` (replay answers 200 with the first link) and capped at `LINK_LIMIT.PerUserMax`.
- `src/links/images/` (#149, ADR 0027): `LinkImageCaptureService` (best effort, never throws, after the create transaction, 5 s budget capped by the rest of the request, confirms the link is the user's before writing), `processLinkImage` (sniff by magic bytes, `sharp` first frame, metadata stripped, WebP: preview 640x360 cover <= 64 KB, favicon 32x32 contain <= 8 KB, 16 MP input limit; SVG/HTML/damaged -> `null`), `decodeIco` (libvips has no ICO), `LinkImagesService.find` (userId filter, 404 for foreign or missing), `sendLinkImage` (stored type, `nosniff`, CORP same-origin, inline, `private, max-age=31536000, immutable`, ETag). `sharp` has no install script (ADR 0020) and must stay imported in `api/index.mjs` with `node_modules/@img/**` in `vercel.json` `includeFiles`. `PATCH` with a new URL deletes the images and the source hints and sets `links.capture_attempted_at` to `NULL` (pending); the link response then carries `?v=pending` image paths (`LINK_IMAGE_PENDING_VERSION`). `POST /api/links/:id/images/capture` (#189, `LinkImageRecaptureService`, `RATE_LIMIT.AddLink`, covered by the global `CsrfGuard`) re-captures: atomic claim (`capture_attempted_at IS NULL OR older than RECAPTURE_COOLDOWN_MS`, plain SQL so `updated_at` stays), page load for new hints (3 s) when none are stored, the normal capture of both kinds, a re-check that the URL did not change meanwhile, all within the request budget (1.5 s margin), no transaction, no lock, only `SafeFetcherService`. It always answers 200 with the `LinkResponse` as it is afterwards (a call that lost the claim or found nothing changes nothing); a foreign or missing link is 404 and claims nothing. `GET /api/links/:id/favicon|image` stay pure reads.
- `src/feedback/` (#100): `FeedbackService` (`prompt` reads `createdAt` / `isDemo` / `onboardingCompletedAt` from the database and applies `dueFeedbackMilestone`; `record` creates the row or appends the comment under the per-user advisory lock `feedback:<userId>`). The comment is user text and is never logged.
- `src/shares/` (#276, ADR 0040): public collections. `FolderSharesService` (owner: get, enable with the `folders:` lock, the 10-per-user cap and 403 for demo users, `showNotes`, reset, disable; a token collision on the unique index is retried) behind `FolderSharesController` (`/api/folders/:id/share`); `PublicCollectionsService` + `PublicCollectionsController` (`/api/public/collections/:token` and its `links/:linkId/favicon|image`, all three in `PUBLIC_ROUTES`, `RATE_LIMIT.PublicCollection` / `PublicCollectionImage`): a token of the wrong shape is refused before any query, then one `findUnique` on the token; the subtree comes from a recursive query restricted to the owner; every miss is the same `SHARE_ERROR_MESSAGE.NotFound` 404; `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` are set before the service runs, so errors carry them too. The token is a capability: never log it.
- **Lock order:** a transaction that takes advisory locks takes `folders:<userId>` (`FoldersService.lockTree`) before `tags:<userId>` (`TagsService.lockUserTags`, also taken inside `resolveNames`), never the reverse. Never fetch a page inside a transaction.

## Rules

- Contract first: request/response shapes live in `libs/shared/contracts` (`@shelfmark/contracts`). A DTO class `implements` the contract interface and carries validation + `@ApiProperty`.
- Contracts: `import type` for shapes. A runtime import (`AUTH_PROVIDER`, `AUTH_ENDPOINT`) works because `webpack.config.js` and `vitest.config.mts` alias `@shelfmark/contracts` to the lib source.
- Controllers are thin; logic lives in services.
- Never use `import type` for injectables (controller/service constructor parameters): it erases decorator metadata and breaks DI.
- Every query on user data filters by `userId` from `@CurrentUser()` (`user.id`), never from body, params or query; a foreign or missing object is 404, never 403. Every user-owned resource gets a data-isolation test (`expectIsolated`, see Testing conventions).
- Every route is closed by default (`SessionAuthGuard`). The integration's package is imported only in `src/auth/**` and `src/common/auth/**` (ESLint); feature modules use `@CurrentUser()` and `@AllowAnonymous()` from `src/common/auth`. No state-changing `GET` (SameSite=Lax cookies ride along on top-level cross-site GETs).
- Errors always use `ApiError` (`{ statusCode, error, message, requestId }`), no stack traces. Validation errors have `message: string[]`.
- `@AllowAnonymous()` is the integration's decorator (key `PUBLIC`). A new public route needs an entry in `PUBLIC_ROUTES`, a comment at the use site and a justification in the PR description; never on a controller class, never `@OptionalAuth()`.
- `NODE_ENV` is fail-safe: only an explicit `development` or `test` is non-production (unset means production). Non-production drops HSTS and `upgrade-insecure-requests` from helmet; `nx serve` sets `NODE_ENV=development`.
- 5xx responses never carry internal messages (generic text); the cause and stack are logged server-side only.
- No CORS: the API is same-origin (web dev proxy `/api` -> `http://localhost:3000`).
- Strict TypeScript: no `any`, no `@ts-ignore`; one interface/type/const per file with the `.interface.ts` / `.type.ts` / `.const.ts` suffix; no TS `enum` (ADR 0024).

## Security

- Never read or create `.env*` files; configuration comes from the platform environment.
- Auth: never set Better Auth's `disableCSRFCheck` or `skipStateCookieCheck`, and never `disableOriginCheck: true` (`createAuth` sets it to `false` explicitly); it skips those checks under `NODE_ENV=test` or a truthy `TEST`, so `vitest.setup.ts` runs specs as `development` without `TEST` and `readAuthConfig` refuses `TEST` in production. Cookies are `SameSite=Lax` (the OAuth callback is a cross-site top-level GET), `Secure` + `__Secure-` exactly when `isProduction`. Never log Better Auth's extra logger arguments (they can hold tokens). A new Better Auth route needs an entry in `ALLOWED_AUTH_ROUTES` on purpose. `disableGlobalAuthGuard: true` stays: it switches off the integration's guard in favour of ours. Rate limits: `@nestjs/throttler` is the first global guard (per client IP, in memory per Vercel instance, ADR 0031); `@RateLimit(RATE_LIMIT.X)` sets a stricter per-route limit, `/api/auth/*` is limited by `createAuthRateLimitMiddleware`, health opts out. Better Auth's own limiter stays as a second layer.
- Never log secrets, tokens, request bodies or personal data. The error filter logs only method, path, status and request id.
- Outbound HTTP (link previews) only through the SSRF-safe fetcher (http/https, private IPs blocked after DNS resolve, timeout, size and redirect limits, no cookies).
- Prisma with parameterised queries only; never `$queryRawUnsafe` / `$executeRawUnsafe` (ESLint forbids both).
- Never read, print or set real database URLs; `local-db.mjs` overrides them with its own loopback URLs.

## Database rules

- Conventions: PascalCase model with `@@map` to a snake_case plural table, camelCase fields with `@map` to snake_case columns, `@default(uuid(7)) @db.Uuid` ids, `@db.Timestamptz(3)` timestamps.
- Never edit an applied migration; add a new one. Destructive changes follow expand-then-contract across deploys (add, backfill and dual-write, switch reads, then drop).
- Migrations are created locally with `nx run api:db-migrate -- --name <name>`, applied in the Vercel build (`api:migrate-deploy`, only when `VERCEL=1`), and verified in CI: CI runs `scripts/db-check.mjs` (deploy plus drift check) against the Postgres service, and `nx run api:db-check` is the local PGlite equivalent.
- Never run `migrate reset` against a non-local database.

## Outbound HTTP: the SSRF-safe fetcher

`src/fetcher/` (`FetcherModule` exports `SafeFetcherService.fetch(url, limits?)` and `fetchImage(url, limits?)`, optional per-call limit overrides that only tighten) is the only allowed way to make an outbound request. Never use `fetch`, `http.request` or an HTTP client anywhere else. The endpoint that uses it (`POST /api/links/preview` and `POST /api/links` without a title, through `LinkPreviewService`, 6 s budget) lives in `src/links/`.

- URL: http/https only, no credentials, at most 2048 characters, ports 80 and 443 only (a deliberate decision: an open port range makes the fetcher a port scanner; pages on other ports are rare).
- DNS is resolved by the fetcher itself; one blocked address in the answer rejects the host. The connection is pinned to the validated addresses through a custom `lookup` (no second lookup, so no DNS rebinding). Blocked ranges: `models/blocked-ip-ranges.const.ts` (private, loopback, link-local incl. cloud metadata, CGNAT, multicast, reserved, NAT64, 6to4, Teredo, unique-local). `ip-policy.ts` expands IPv6 and unwraps IPv4-mapped / compatible forms; anything that is not a canonical IP literal fails closed. `localhost`, `*.localhost`, `*.local` and `*.internal` are refused by name.
- Every redirect hop goes through the same validation; at most 5 hops. A malformed, empty or non-http(s) `Location` is `InvalidUrl` (or `DisallowedProtocol`), never an unhandled error. No cookies, no `Authorization`, `Accept-Encoding: identity` (a response with any other `Content-Encoding` is `UnsupportedEncoding`), no keep-alive agent (`agent: false`; proxy environment variables such as `NODE_USE_ENV_PROXY` are not honoured, a proxy would bypass the pinned lookup).
- Limits (`models/fetch-limits.const.ts`): 3 s connect, 8 s total, 2 MB body (checked on `Content-Length` and while streaming). Only `text/html` and `application/xhtml+xml` for `fetch`; `fetchImage` (image mode, ADR 0027) takes `image/*` except SVG and `application/octet-stream`, 3 MB, 5 s, 3 redirects, raw bytes, the format is decided from the magic bytes by the caller. The body is decoded with the header charset, else a `<meta charset>`, else UTF-8.
- Failures are `SafeFetchError` with a `code` (`models/safe-fetch-error-code.const.ts`); messages never carry response data. The caller maps them to a fallback preview.
- Tests inject `SAFE_FETCHER_OPTIONS` (fake resolver, loopback policy, local port) and run against a `127.0.0.1` server; unit tests never use the network.
- `src/preview/`: `extractPreview(html, finalUrl)` (parse5; og:title, twitter:title, `<title>`; only the head, first 32 K characters are parsed), `fallbackPreview(url)`; `normalizeUrl` for duplicate detection (PROJECT.md 6.1) lives in `@shelfmark/contracts`, shared with the web app. The document is cut at the first `</head>` (a `</head>` inside a comment or script ends it early; the preview then falls back to the URL data, which is acceptable). Image and favicon URLs must be http(s), without credentials, at most 2048 characters; `<base href>` is honoured only when it is http(s). `parse5` is ESM-only and must stay listed in `api/index.mjs`.

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
- Data isolation: `createAuthTestApp({ imports: [FixtureModule] })`, `createIsolationUsers(t)` and `expectIsolated(app, users, scenario)` from `test-utils/isolation`. Example:

```ts
const users = await createIsolationUsers(t);
await expectIsolated(t.app, users, {
  create: async (a) =>
    (await a.post('/api/links').send({ url: 'https://example.com' }).expect(201)).body.id,
  read: (u, id) => u.get(`/api/links/${id}`),
  update: (u, id) => u.patch(`/api/links/${id}`).send({ title: 'x' }),
  remove: (u, id) => u.delete(`/api/links/${id}`),
  list: {
    request: (u) => u.get('/api/links'),
    ids: (b) => (b as ListLinksResponse).items.map((l) => l.id),
  },
  reference: (u, id) => u.post('/api/links').send({ url: 'https://example.com', folderId: id }),
  // or skip: { reference: 'reason' } (update, remove, list, reference: provide or skip with a reason)
});
```
