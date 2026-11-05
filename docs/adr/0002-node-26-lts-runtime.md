# 0002. Node 26 LTS runtime

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 5.7

## Context

The same Node version must run locally, in CI and on Vercel (static web + one Vercel Function for the API, PROJECT.md 5.7). The approved stage 0 plan first chose Node 24 LTS; the author then changed the decision.

## Decision

- **Node 26 LTS**: `.nvmrc` = `26`, `package.json` `engines.node` = `>=26 <27`.
- Reason: Vercel has Node 26 LTS GA for builds and Functions (the default for new projects), and Angular 22 supports `>=26`.
- `.npmrc` has `engine-strict=true`: `npm ci` / `npm install` fail on another Node major.
- `npm@11.20.0` is recorded in `packageManager`; `@types/node` follows the runtime major (26.x).

## Consequences

- Local, CI and Vercel run the same major; no "works on my machine" between 24 and 26.
- Contributors must switch Node (`nvm use`) before installing; a wrong version fails fast instead of producing a subtly different lockfile.
- Moving to Node 28 is an explicit change of `.nvmrc`, `engines`, `@types/node` and the Vercel project setting.

## Alternatives considered

- **Node 24 LTS** (`>=24.15.0 <25`) — the original plan; replaced because Node 26 is Vercel's default and supported by Angular 22.
- **No engine check** — mismatched runtimes would surface only in CI or production.
