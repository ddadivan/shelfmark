# apps/api

NestJS REST API, mounted under `/api` (port 3000). Source of truth: `docs/PROJECT.md` 5.2–5.4, 5.8 and 6.

## Stack

- NestJS 12 (`@nestjs/common|core|platform-express` 12.3.3, ESM-only), Express, `@nestjs/swagger` 12, `class-validator` + `class-transformer`, `helmet`.
- Build: webpack (`webpack-cli build`, tsc loader, ESM output, all dependencies external) into `dist/apps/api` (`main.mjs`, `vercel-handler.mjs`; `.mjs` so the module type is never guessed). No esbuild: it does not emit decorator metadata, which Nest DI needs. No `@nx/nest` (no Nest 12 support), no `@nx/node`, no `@nestjs/cli`, no `@nestjs/config`.
- `@nx/webpack` 24 has no `webpack` executor, so `build` and `serve` are `nx:run-commands` around `webpack-cli`.
- Tests: Vitest with SWC (`unplugin-swc`, Vite's own TS transform disabled with `oxc: false`) so decorator metadata works. Supertest on `createApp()`.

## Layout

- `src/main.ts` - bootstrap and `listen` only.
- `src/vercel-handler.ts` - second webpack entry (`vercel-handler.mjs`): Vercel Function handler, one Nest app per instance (`createApp()` + `init()`, no `listen`), cached promise reset on failure. Re-exported by the root `api/index.mjs` (ADR 0019).
- `src/app/create-app.ts` - `NestFactory` (explicit `ExpressAdapter`) + `configureApp`; reused by `main.ts`, the Vercel handler and tests.
- `src/app/configure-app.ts` - request id, helmet, 100kb JSON limit, `/api` prefix, global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform), `AllExceptionsFilter`, Swagger at `/api/docs` (public in every environment, by decision).
- `src/config/` - typed reader for `PORT` and `NODE_ENV`, validated at boot. Never loads `.env` files.
- `src/common/` - cross-cutting pieces (request id, error filter, `@AllowAnonymous`).
- `src/<domain>/` - one module per domain (`auth`, `users`, `links`, `folders`, `tags`, `metadata`, ...) with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`.

## Rules

- Contract first: request/response shapes live in `libs/shared/contracts` (`@shelfmark/contracts`). A DTO class `implements` the contract interface and carries validation + `@ApiProperty`.
- Contracts are imported type-only for now (`import type`). A runtime import from the lib needs a `resolve.alias` in `webpack.config.js` first.
- Controllers are thin; logic lives in services.
- Never use `import type` for injectables (controller/service constructor parameters): it erases decorator metadata and breaks DI.
- From stage 2 every query on user data filters by `userId` from the session; a foreign or missing object is 404, never 403. Every user-owned resource gets a data-isolation test.
- Errors always use `ApiError` (`{ statusCode, error, message, requestId }`), no stack traces. Validation errors have `message: string[]`.
- `@AllowAnonymous()` must be justified in the PR description and in a comment at the use site. It is a NO-OP until the global AuthGuard from stage 2 exists; all routes are currently public.
- `NODE_ENV` is fail-safe: only an explicit `development` or `test` is non-production (unset means production). Non-production drops HSTS and `upgrade-insecure-requests` from helmet; `nx serve` sets `NODE_ENV=development`.
- 5xx responses never carry internal messages (generic text); the cause and stack are logged server-side only.
- No CORS: the API is same-origin (web dev proxy `/api` -> `http://localhost:3000`).
- Strict TypeScript: no `any`, no `@ts-ignore`; one interface/type/const per file with the `.interface.ts` / `.type.ts` / `.const.ts` suffix; no TS `enum` (ADR 0024).

## Security

- Never read or create `.env*` files; configuration comes from the platform environment.
- Never log secrets, tokens, request bodies or personal data. The error filter logs only method, path, status and request id.
- Outbound HTTP (link previews) only through the SSRF-safe fetcher (http/https, private IPs blocked after DNS resolve, timeout, size and redirect limits, no cookies).
- Prisma with parameterised queries only; never `$queryRawUnsafe`.

## Outbound HTTP: the SSRF-safe fetcher

`src/fetcher/` (`FetcherModule` exports `SafeFetcherService.fetch(url)`) is the only allowed way to make an outbound request. Never use `fetch`, `http.request` or an HTTP client anywhere else. The endpoint that uses it (`POST /api/links/preview`) comes with #65.

- URL: http/https only, no credentials, at most 2048 characters, ports 80 and 443 only (a deliberate decision: an open port range makes the fetcher a port scanner; pages on other ports are rare).
- DNS is resolved by the fetcher itself; one blocked address in the answer rejects the host. The connection is pinned to the validated addresses through a custom `lookup` (no second lookup, so no DNS rebinding). Blocked ranges: `models/blocked-ip-ranges.const.ts` (private, loopback, link-local incl. cloud metadata, CGNAT, multicast, reserved, NAT64, 6to4, Teredo, unique-local). `ip-policy.ts` expands IPv6 and unwraps IPv4-mapped / compatible forms; anything that is not a canonical IP literal fails closed. `localhost`, `*.localhost`, `*.local` and `*.internal` are refused by name.
- Every redirect hop goes through the same validation; at most 5 hops. A malformed, empty or non-http(s) `Location` is `InvalidUrl` (or `DisallowedProtocol`), never an unhandled error. No cookies, no `Authorization`, `Accept-Encoding: identity` (a response with any other `Content-Encoding` is `UnsupportedEncoding`), no keep-alive agent (`agent: false`; proxy environment variables such as `NODE_USE_ENV_PROXY` are not honoured, a proxy would bypass the pinned lookup).
- Limits (`models/fetch-limits.const.ts`): 3 s connect, 8 s total, 2 MB body (checked on `Content-Length` and while streaming). Only `text/html` and `application/xhtml+xml`. The body is decoded with the header charset, else a `<meta charset>`, else UTF-8.
- Failures are `SafeFetchError` with a `code` (`models/safe-fetch-error-code.const.ts`); messages never carry response data. The caller maps them to a fallback preview.
- Tests inject `SAFE_FETCHER_OPTIONS` (fake resolver, loopback policy, local port) and run against a `127.0.0.1` server; unit tests never use the network.
- `src/preview/`: `extractPreview(html, finalUrl)` (parse5; og:title, twitter:title, `<title>`; only the head, first 32 K characters are parsed), `fallbackPreview(url)`, and `normalizeUrl(url)` for duplicate detection (PROJECT.md 6.1). The document is cut at the first `</head>` (a `</head>` inside a comment or script ends it early; the preview then falls back to the URL data, which is acceptable). Image and favicon URLs must be http(s), without credentials, at most 2048 characters; `<base href>` is honoured only when it is http(s). `parse5` is ESM-only and must stay listed in `api/index.mjs`.

## Commands

```bash
npx nx serve api                  # http://localhost:3000/api (Swagger: /api/docs)
# serve cold start: a production build runs first (dependsOn build), then the webpack
# watch rebuilds and node --watch restarts the server on each change.
npx nx build api                  # dist/apps/api, run with: node dist/apps/api/main.mjs
npx nx test api                   # Vitest, coverage on by default, thresholds 80%
npx nx run-many -t lint typecheck test build -p api contracts
```

## Testing conventions

- Specs sit next to the code (`*.spec.ts`).
- Integration tests build the app with `createApp()` (or `Test.createTestingModule` + `configureApp`) and call it with Supertest; close the app in `afterAll`.
- Unit-test pure helpers and filters directly; no network, no real database in unit tests.
