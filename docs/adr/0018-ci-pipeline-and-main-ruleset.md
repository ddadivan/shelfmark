# 0018. CI pipeline, required checks and the `main` ruleset

- Status: Accepted
- Date: 2026-11-05
- Source: issue #2; `docs/PROJECT.md` 5.8, 9.3, 9.5; `docs/SETUP.md` section 2

## Context

Every PR must be checked automatically and `main` may change only through a green PR (PROJECT.md 9.3, 9.5). The repository is public and user-owned, so GitHub Actions minutes, CodeQL and rulesets are free. Nx Cloud is off ([0001](0001-nx-monorepo-and-dependency-pinning.md)); Node comes from `.nvmrc` with `engine-strict` ([0002](0002-node-26-lts-runtime.md)); gitleaks already runs in lefthook ([0003](0003-tooling-guardrails.md)); e2e runs Chromium desktop + phone on the production build ([0008](0008-e2e-playwright-chromium.md)). Most commits come from agents and Dependabot, so the gate must be enforced by GitHub, not by habit.

## Decision

- **One workflow**, `.github/workflows/ci.yml`, named `CI`, on `pull_request` (to `main`) and `push` to `main`. No `paths` filters: required checks must always report; `nx affected` does the narrowing.
- **Four independent jobs, no `needs` between them** (a skipped job counts as passed for a required check). Their names are the required status checks:
  - `lint-test-build` — `npm run format:check`, `npm run lint:styles`, `nx affected -t lint typecheck test build`;
  - `e2e` — `nx affected -t e2e` with `CI=true` (Playwright serves the production build via `web:serve-static`), report uploaded on failure;
  - `npm-audit` — `npm audit --audit-level=high` on the full tree (dev dependencies run in CI too, so they are not omitted);
  - `gitleaks` — the gitleaks **binary** (version and SHA-256 pinned in the workflow, not a checksum file from the same release; Dependabot does not bump them, so both are updated by hand) scans the full git history with `.gitleaks.toml`, the same CLI as lefthook.
- Nx base/head from `nrwl/nx-set-shas`; Node from `actions/setup-node` with `node-version-file: .nvmrc` and npm cache; Nx local cache (`.nx/cache`) in `actions/cache`. Playwright browsers are not cached (`npx playwright install --with-deps chromium`).
- **Hardening:** workflow-level `permissions: {}` and `contents: read` per job (plus `actions: read` where `nx-set-shas` runs); every action pinned to a full commit SHA with a `# vX.Y.Z` comment (Dependabot `github-actions` keeps them current); `persist-credentials: false`; `timeout-minutes` per job; concurrency per PR with `cancel-in-progress` on PRs only; no secrets used. `SCARF_ANALYTICS=false` at workflow level backs up `scarfSettings`.
- Coverage thresholds are enforced in the normal `test` target: `apps/api` enables Vitest coverage by default, as `libs/ui` already does.
- **CodeQL default setup** (JavaScript/TypeScript and GitHub Actions), not an advanced workflow.
- **`main` ruleset** (`~DEFAULT_BRANCH`, active, no bypass actors): PR required with 0 approvals and squash merge only; required status checks `lint-test-build`, `e2e`, `npm-audit`, `gitleaks` bound to the GitHub Actions app, branch must be up to date; code scanning rule for CodeQL (errors, security high or higher); no deletion, no force push, linear history. Repository setting "require actions pinned to a SHA" on.
- An `npm audit` failure is fixed by upgrading or an exact `overrides` entry, never by lowering `--audit-level` or adding `--omit=dev`. If no fix exists, the exception is a new ADR.

- **Non-required `lighthouse` job** (issue #111): Lighthouse CI (`@lhci/cli`, exact version via `npx` in the `web-e2e:lighthouse` target, config in `apps/web-e2e/lighthouserc.cjs`) audits the `e2e` static build with Playwright's Chromium. Assertions: performance, accessibility and best-practices >= 0.9, CLS <= 0.1 (PROJECT.md section 10.1). Reports go to a filesystem artifact, no external upload. It is not in the ruleset; the author decides when to make it required. `@lhci/cli` is not a devDependency because it adds nine high `npm audit` findings, which would fail the required `npm-audit` job; it has no install scripts.

## Consequences

- One file to read; required check names are stable as long as job names do not change. Renaming a job means updating the ruleset in the same change.
- Four parallel `npm ci` runs cost minutes, which are free for a public repository; wall-clock time stays short.
- A new high advisory anywhere in the tree blocks every PR, including Dependabot ones, until it is fixed; that is intended.
- "Branch up to date" makes queued Dependabot PRs rebase before merge; Dependabot does it automatically.
- Agents cannot change protection; the author merges through the normal UI flow.

## Alternatives considered

- **Several workflow files** — more duplication of setup steps; required check names are just as stable in one file.
- **One job running everything** — one red check hides which gate failed; e2e and audit cannot run in parallel.
- **A single aggregator check** (`ci-ok` with `needs`) — fewer ruleset entries, but adds a job whose `if: always()` logic must be right; four named checks are clearer at this size.
- **`gitleaks/gitleaks-action`** — free for user-owned repos, but needs the token, comments on PRs and wraps the same binary; the binary keeps permissions at `contents: read`.
- **Advanced CodeQL workflow** — more control, not needed for JS/TS and Actions.
- **Classic branch protection** — rulesets are the current API, are visible to everyone and support the code scanning rule.
