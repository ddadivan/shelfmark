# 0001. Nx monorepo, single package.json, exact pins

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 5.0

## Context

Shelfmark has an Angular client, a NestJS API and shared libraries (`libs/ui`, `libs/shared/contracts`) that must evolve together: contracts are written first and consumed by both sides (PROJECT.md 5.0). The repository already contained `docs/`, `.claude/` and `.github/` when the workspace was created. Current npm `latest` of TypeScript is 7, which Angular 22 does not support.

## Decision

- One public repository, **Nx 24** monorepo (`nx` and all `@nx/*` pinned to the same version, 24.0.4). Nx Cloud is off for stage 1 (`neverConnectToCloud`, analytics off). `defaultBase: main`; CI runs `nx affected -t lint typecheck test build`.
- Scaffolded by hand in the existing repo: no `create-nx-workspace`, **no Nx "TS solution" setup** (no workspaces, no project references).
- **One root `package.json`**, **npm** as package manager (`packageManager: npm@11.20.0`), one `package-lock.json`. Projects have no own dependencies.
- Libraries resolve through **path aliases** in `tsconfig.base.json` (`@shelfmark/*`, e.g. `@shelfmark/contracts`), relative paths, no `baseUrl` (deprecated in TS 6).
- Every project declares explicit `build` / `typecheck` targets and `scope:*` / `type:*` tags (see [0003](0003-tooling-guardrails.md)).
- **Exact versions**: `.npmrc` has `save-exact=true`; no `^` / `~` ranges.
- **TypeScript 6.0** (6.0.3) because Angular 22 supports only 6.0; **stylelint 17** because `stylelint-config-standard-scss` 17 targets it. Dependabot ignores `typescript >= 6.1` and `stylelint >= 18`, and groups updates (`angular`, `nx`, `nestjs`, `vitest`, `storybook`, dev tooling minor/patch).
- The lockfile is never merged by hand: on conflicts take it from `main` and regenerate with `npm install`.

## Consequences

- One install, one version of each dependency, atomic changes across web, api and contracts; `nx affected` keeps CI fast.
- Upgrades are deliberate: a TypeScript or stylelint major waits until Angular / the SCSS config support it, then the Dependabot ignore is removed.
- Path aliases need bundler support per app: the API (webpack) imports contracts type-only until a `resolve.alias` is added ([0006](0006-api-nestjs-build-and-tests.md)).
- No per-project `package.json` means no independent publishing; not needed in stage 1.

## Alternatives considered

- **`create-nx-workspace`** — would scaffold into a fresh folder and overwrite the existing repo layout.
- **Nx "TS solution" setup (npm workspaces + project references)** — more moving parts for four projects; Angular and Nest builders work with plain path aliases.
- **pnpm / yarn** — no need beyond npm for one lockfile; npm ships with Node.
- **Caret ranges** — silent minor bumps break the Angular / TypeScript / Nx compatibility matrix.
- **Nx Cloud remote cache** — not needed at this size; off for stage 1.
