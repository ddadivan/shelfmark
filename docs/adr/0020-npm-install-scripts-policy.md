# 0020. npm install-scripts policy

- Status: Accepted
- Date: 2026-11-05
- Source: issue #4

## Context

npm 11 warns on `npm ci` that 9 packages have install scripts not covered by `allowScripts`. Install scripts run arbitrary code on every developer machine, in CI and on Vercel, so each one needs an explicit decision. Targets are macOS arm64/x64 and Linux x64 (CI, Vercel). `scarfSettings.enabled=false` is already set in `package.json`, and the `prepare` script (`scripts/prepare.mjs`) installs the git hooks (ADR 0003).

## Decision

All 9 packages are **denied**. The decision is stored in `allowScripts` in `package.json`, keyed by package name (`false` = denied), written by `npm install-scripts deny`. Name-only keys cover future versions; a new version does not reopen the question, a new package does.

| Package               | What the script does                                                         | Decision | Reason                                                                                         |
| --------------------- | ---------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `@parcel/watcher`     | `node-gyp rebuild` only when `build_from_source=true`                        | Deny     | No-op by default; prebuilt `@parcel/watcher-*` binaries are used.                              |
| `@scarf/scarf`        | `report.js` sends install analytics                                          | Deny     | Telemetry, no functional value.                                                                |
| `@swc/core`           | `postinstall.js` checks the native binary, falls back to `@swc/wasm`         | Deny     | Verification/fallback only; `@swc/core-*` optional binaries cover our platforms.               |
| `esbuild`             | `install.js` validates the platform binary and may swap it for a faster path | Deny     | Optimisation/verification only; `@esbuild/*` optional binaries are used directly.              |
| `fsevents`            | Fallback native build                                                        | Deny     | Ships a prebuilt `fsevents.node`; macOS-only optional dependency.                              |
| `lefthook`            | `postinstall.js` runs `lefthook install` (skipped when `CI` is set)          | Deny     | `prepare` already runs `lefthook install` locally; same effect, no dependency script needed.   |
| `lmdb`                | `node-gyp-build-optional-packages` (prebuilt lookup, compile fallback)       | Deny     | Prebuilt `@lmdb/*` binaries are loaded at runtime; used by Nx/Angular caches.                  |
| `msgpackr-extract`    | `node-gyp-build-optional-packages` (prebuilt lookup, compile fallback)       | Deny     | Optional speed-up; prebuilt `@msgpackr-extract/*` exist and msgpackr has a pure JS fallback.   |
| `nx`                  | `dist/bin/post-install` verifies platform support and updates the Nx Cloud client | Deny | Not critical (30s timeout, errors swallowed); we do not use Nx Cloud. Nx verified working without it. |

### Rule for future packages

- New install scripts are **denied by default**. `npm install-scripts ls` must show no unreviewed packages.
- Approve (`npm install-scripts approve <pkg>`) only with a written reason in the PR and a new row in this ADR (or an update to it).
- Before approving, check whether a prebuilt binary or an opt-out flag makes the script unnecessary.

## Consequences

- `npm ci` and `npm ci --include=dev` (Vercel) print no install-scripts warning.
- Verified after a clean install: lint, typecheck, test, build, stylelint, Prettier, lefthook pre-commit, Storybook build and Playwright e2e all pass.
- If a platform without prebuilt binaries is added, or a tool breaks without its script, revisit the affected row.

## Alternatives considered

- **Approve all** — runs unreviewed code, including telemetry, for no benefit.
- **Ignore the warning** — leaves the decision implicit; a malicious new script would go unnoticed.
- **`ignore-scripts=true` in `.npmrc`** — also blocks our own `prepare` and hides future review points.
