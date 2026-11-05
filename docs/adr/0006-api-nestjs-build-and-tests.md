# 0006. API: NestJS 12 ESM, webpack build, SWC in tests

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 5.2, 5.7

## Context

PROJECT.md 5.2 chooses NestJS; 5.7 deploys it as one Vercel Function. NestJS 12 is ESM-only, and its DI relies on decorator metadata (`emitDecoratorMetadata`). At the time of the API skeleton task, `@nx/nest` did not support Nest 12, and `@nx/webpack` 24.0.4 had no `webpack` executor.

## Decision

- **NestJS 12.3** on Express, ESM output, `@nestjs/swagger`, `class-validator` / `class-transformer`.
- **Build with webpack** (tsc loader, all dependencies external) via **`webpack-cli`**, wrapped in `nx:run-commands` targets `build` and `serve` (`serve` = webpack watch + `node --watch`). Output `dist/apps/api`.
- **No esbuild** (does not emit decorator metadata), **no `@nx/nest`**, `@nx/node`, `@nestjs/cli` or `@nestjs/config`; project files are hand-written.
- **Vitest with SWC** (`unplugin-swc`, Vite's own TS transform off) so decorator metadata exists in tests; integration tests use Supertest.
- **`createApp()` / `configureApp()` split**: `main.ts` only bootstraps and listens; `create-app.ts` builds the Nest app; `configure-app.ts` applies middleware, pipes, filters, prefix and Swagger. Tests and the future Vercel handler (deploy task) reuse them.
- `@shelfmark/contracts` is imported **type-only** for now; a runtime import needs a webpack `resolve.alias` first.

## Consequences

- DI works in both build and tests; production and test apps are configured by the same function.
- More hand-written config than a generator would give; revisit `@nx/nest` / an Nx executor when they support Nest 12.
- Open for the deploy task: ESM output form (`.mjs` / `type: module`), Swagger UI assets and `NODE_ENV=production` on Vercel.
- Never use `import type` for injectables: it erases the metadata DI needs.

## Alternatives considered

- **esbuild (Nx default for Node)** — no decorator metadata, breaks Nest DI.
- **`@nx/nest` generators** — no Nest 12 support.
- **`@nestjs/cli` build** — a second build system next to Nx.
- **Vitest with Vite's default transform** — no decorator metadata.
