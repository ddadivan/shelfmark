# 0019. Vercel deployment architecture: static web, API function, headers, CLI policy

- Status: Proposed
- Date: 2026-11-05
- Source: issue #3; `docs/PROJECT.md` 5.7, 5.8, 9.2; `docs/SETUP.md` 5.6; [0006](0006-api-nestjs-build-and-tests.md), [0007](0007-api-security-baseline.md), [0013](0013-vercel-hobby-hosting.md)

## Context

[0013](0013-vercel-hobby-hosting.md) puts the CSR Angular app and the NestJS API on one Vercel Hobby project and leaves the exact monorepo configuration to the deploy task. Facts: Vercel project `shelfmark-app` (`shelfmark-app.vercel.app`), function region `fra1` next to Neon `eu-central-1`, Node 26.x, Vercel Authentication on previews, `NODE_ENV=production` for Production and Preview. The API is built by webpack into an ESM bundle with all dependencies external ([0006](0006-api-nestjs-build-and-tests.md)); `createApp()` is meant to be reused by a Vercel handler. Swagger UI at `/api/docs` is served from `swagger-ui-dist` files on disk. `docs/SETUP.md` 5.6 fixes a strict CSP for the web. Agents must never see secrets, and the author is about to log in the Vercel and Neon CLIs.

## Decision

- **One `vercel.json` at the repo root**, framework preset off (`framework: null`): `npm ci`, then `nx run-many -t build -p web api`; static output `dist/apps/web/browser`; `regions: ["fra1"]` pinned in config, not only in the dashboard.
- **API as one Vercel Function** at `api/index.mjs` (repo root), which re-exports the prebuilt handler `dist/apps/api/vercel-handler.mjs` and statically imports every runtime package (`@nestjs/*`, `helmet`, `reflect-metadata`, `tslib`, plus `class-validator`, `class-transformer` and `swagger-ui-dist`, which Nest loads by name). The bundle loads externals through `createRequire(import.meta.url)`, which Vercel's file tracer does not follow, so without these imports `node_modules` is missing from the function (issue #11); `apps/api/src/vercel-entry.spec.ts` fails when the API imports a package the entry does not list. The handler is a second webpack entry in `apps/api` (`src/vercel-handler.ts`): it builds the Nest app once per instance with `createApp()` + `app.init()` (no `listen`), caches the promise at module scope (reset on failure), and passes each request to the underlying Express instance. `createApp()` passes an explicit `ExpressAdapter`, so the file tracer sees `@nestjs/platform-express`.
- **ESM by extension**: webpack emits `.mjs` (`main.mjs`, `vercel-handler.mjs`), so Node and the function bundler never guess the module type. Decorator metadata stays a webpack/tsc concern; Vercel never compiles our TypeScript.
- **Rewrites**: `/api/:path*` goes to the function (Nest keeps the `/api` prefix); every path without a dot falls back to `/index.html` (SPA); a missing `/foo.js` or `/media/x.woff2` stays a real 404 instead of returning HTML. Unknown `/api/*` paths return the Nest `ApiError` 404, never `index.html`.
- **Swagger UI assets** are added to the function with `includeFiles` for `node_modules/swagger-ui-dist/**`, because they are read from disk at runtime and are invisible to tracing.
- **Headers split by owner**: non-API paths get the CSP from `docs/SETUP.md` 5.6 verbatim (including `form-action 'self'`) plus `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` from `vercel.json`; `/api/*` keeps only helmet's headers ([0007](0007-api-security-baseline.md)), whose CSP allows the inline styles of Swagger UI. Two CSP headers on one response would intersect, so `vercel.json` never sets a CSP on `/api`. Hashed build files (`*-HASH.(js|css)` in one rule, `media/*`) get `Cache-Control: public, max-age=31536000, immutable`; HTML keeps Vercel's revalidating default.
- **CSP is tested** by Playwright on the production build: the test applies the CSP read from `vercel.json` to document responses and fails on any `securitypolicyviolation` or CSP console error; against a deployed URL (`BASE_URL`) it asserts the real header instead.
- **Function limits**: `maxDuration` 10 s; memory left at the plan default; Node version from `engines` (`>=26 <27`) and the dashboard.
- **CLI secret policy**: `.claude/hooks/guard.mjs` and the permission deny list block every Vercel and Neon CLI command that prints, writes or injects secret values (`vercel env *`, `vercel pull`, `vercel dev`, `vercel api`, Neon `connection-string` / `cs`, `projects create`, `branches create`, `roles`, `init`, and flags such as `--show-secrets`, `--decrypt`, `--psql`), whether run directly or through `npx` / `npm exec` / `pnpm exec|dlx` / `yarn` / `bunx`, or nested in `bash -c`, `eval` and `node -e`. The guard parses commands quote-aware (quoted prose is data), and also blocks the CLI credential stores (`com.vercel.cli`, `~/.config/neonctl`, `.vercel/`), bare `env` / `printenv`, echoing token-like variables and `vercel deploy -e|--build-env`. Agents verify deployments through GitHub deployment statuses, not the Vercel CLI.

## Consequences

- One config file, no Vercel framework detection, and the same webpack bundle runs locally (`node dist/apps/api/main.mjs`) and on Vercel.
- The function contains only the handler bundle, traced `node_modules` and Swagger assets; far below the 250 MB limit. A cold start pays for one Nest bootstrap; warm invocations reuse it.
- A dependency loaded in a way tracing cannot see shows up as "Cannot find module" on the preview and is fixed by a static import or `includeFiles`.
- The strict `style-src 'self'` holds today because no component with runtime styles renders. Angular injects component styles as `<style>` elements, which this CSP blocks; `ngCspNonce` needs a per-request nonce that static hosting cannot produce. **Decided by the author:** before the first `libs/ui` component (or a CDK overlay) renders in `apps/web`, a Vercel Routing Middleware injects a per-request nonce into `index.html` (`ngCspNonce`) and the CSP header; `'unsafe-inline'` stays out. Tracked in its own issue. The CSP e2e test makes that moment visible.
- Previews are behind Vercel Authentication, so agents cannot fetch them; the author verifies previews, agents verify production. **Decided by the author:** no Protection Bypass for Automation token for now.
- **Decided by the author:** Dependabot branches get no preview deployment (`git.deploymentEnabled` for `dependabot/**` is `false`), so they do not use up Neon preview branches; they are still fully checked by CI.
- Helmet sets HSTS, `nosniff`, Referrer-Policy and its own CSP on `/api/*` in production (fail-safe on `NODE_ENV`), which is why the Vercel header rule excludes `/api`.
- Express `trust proxy` and rate limiting are stage 2 concerns.
- Stage 2, Neon previews: preview branches copy the parent branch's data, so before real users exist previews must branch from a data-free parent (or the preview database points at a separate dev branch).
- Stage 2, handler bootstrap: once a database is involved, the handler's reset-on-failure retry needs backoff so a down database does not turn every request into a bootstrap attempt.

## Alternatives considered

- **Vercel's zero-config NestJS / Express detection** — expects the Nest app as the project root entry and builds it with Vercel's own toolchain; does not fit an Nx monorepo with an Angular static output next to it, and its TypeScript build is not our webpack + decorator-metadata pipeline.
- **TypeScript entry `api/index.ts`** — Vercel would compile it with its own settings; the logic lives in `apps/api` (typed, tested) and the root file stays a plain re-export.
- **`{"type":"module"}` package.json in `dist/apps/api`** — works, but is one more generated file that tracing must carry; `.mjs` is unambiguous.
- **Legacy `builds` in `vercel.json`** — deprecated style; disables the build command and zero-config function handling.
- **A custom static server with the same headers for e2e** — more code to maintain; injecting the CSP in Playwright from the same `vercel.json` tests the same policy on the same build, and the real header is checked on the deployed URL.
- **`'unsafe-inline'` in `style-src` now** — rejected by `docs/SETUP.md` 5.6; revisit only with the libs/ui decision above.
