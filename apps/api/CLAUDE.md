# apps/api

NestJS REST API, mounted under `/api` (port 3000). Source of truth: `docs/PROJECT.md` 5.2–5.4, 5.8 and 6.

## Stack

- NestJS 12 (`@nestjs/common|core|platform-express` 12.3.3, ESM-only), Express, `@nestjs/swagger` 12, `class-validator` + `class-transformer`, `helmet`.
- Build: webpack (`webpack-cli build`, tsc loader, ESM output, all dependencies external) into `dist/apps/api`. No esbuild: it does not emit decorator metadata, which Nest DI needs. No `@nx/nest` (no Nest 12 support), no `@nx/node`, no `@nestjs/cli`, no `@nestjs/config`.
- `@nx/webpack` 24 has no `webpack` executor, so `build` and `serve` are `nx:run-commands` around `webpack-cli`.
- Tests: Vitest with SWC (`unplugin-swc`, Vite's own TS transform disabled with `oxc: false`) so decorator metadata works. Supertest on `createApp()`.

## Layout

- `src/main.ts` - bootstrap and `listen` only.
- `src/app/create-app.ts` - `NestFactory` + `configureApp`; reused by tests and later the Vercel handler.
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
- Strict TypeScript: no `any`, no `@ts-ignore`; one interface/type/enum per file with the `.interface.ts` / `.type.ts` / `.enum.ts` suffix.

## Security

- Never read or create `.env*` files; configuration comes from the platform environment.
- Never log secrets, tokens, request bodies or personal data. The error filter logs only method, path, status and request id.
- Outbound HTTP (link previews) only through the SSRF-safe fetcher (http/https, private IPs blocked after DNS resolve, timeout, size and redirect limits, no cookies).
- Prisma with parameterised queries only; never `$queryRawUnsafe`.

## Commands

```bash
npx nx serve api                  # http://localhost:3000/api (Swagger: /api/docs)
# serve cold start: a production build runs first (dependsOn build), then the webpack
# watch rebuilds and node --watch restarts the server on each change.
npx nx build api                  # dist/apps/api, run with: node dist/apps/api/main.js
npx nx test api --coverage        # Vitest, thresholds 80%
npx nx run-many -t lint typecheck test build -p api contracts
```

## Testing conventions

- Specs sit next to the code (`*.spec.ts`).
- Integration tests build the app with `createApp()` (or `Test.createTestingModule` + `configureApp`) and call it with Supertest; close the app in `afterAll`.
- Unit-test pure helpers and filters directly; no network, no real database in unit tests.
