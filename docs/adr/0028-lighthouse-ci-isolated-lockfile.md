# 0028. Lighthouse CI in an isolated lockfile outside the root audit scope

- Status: Proposed
- Date: 2026-11-07
- Source: issue #111; `docs/PROJECT.md` 9.4, 9.5, 10.1; [0018](0018-ci-pipeline-and-main-ruleset.md); [0020](0020-npm-install-scripts-policy.md)

## Context

The quality bar asks for Lighthouse >= 90 (performance, accessibility, best practices) on the web app. `@lhci/cli` (and the `lighthouse` package) depend on `puppeteer-core`, `proxy-agent` and `basic-ftp`. Installed in the root tree they add nine high `npm audit` advisories (0 before), which would turn the required `npm-audit` job red ([0018](0018-ci-pipeline-and-main-ruleset.md)). ADR 0018 forbids lowering `--audit-level` or omitting dev dependencies, and says an unfixable advisory needs a new ADR. Running `npx @lhci/cli@x` in CI would avoid the audit but leaves transitive versions unpinned, which is a supply-chain gap.

## Decision

- Lighthouse CI is installed from its own lockfile, `tools/lighthouse/package.json` (exact `@lhci/cli`) and `package-lock.json`, with `npm ci --ignore-scripts --prefix tools/lighthouse`. It is not a root dependency and is outside the root audit, lint and format scope.
- Install scripts stay off ([0020](0020-npm-install-scripts-policy.md)); `npm install-scripts ls` in that directory reports none.
- It only runs in the non-required `lighthouse` CI job (on pull requests only when `web` is affected, on every push to `main`) and locally through `nx run web-e2e:lighthouse`. It audits our own static build, handles no secrets and the job has `contents: read` only.
- The advisories stay visible: the job runs `npm audit --prefix tools/lighthouse --audit-level=high` with `continue-on-error`.
- Dependabot tracks `/tools/lighthouse` weekly, so updates (and fixes of the advisories) arrive as PRs.
- If `lighthouse` is made a required check, or a fix-less critical advisory appears, this ADR is revisited.

## Consequences

- The required `npm-audit` job and root tree are unchanged; the exception is confined to one directory and one non-required job.
- A second lockfile to keep current (Dependabot does it).
- Known high advisories exist in a dev-only tool that is never shipped or given secrets.

## Alternatives considered

- **Root devDependency** - fails the required `npm-audit` job.
- **`npx @lhci/cli@x`** - exact top-level pin only; transitive dependencies float on every run.
- **Weaker root audit level or `overrides`** - forbidden by 0018; overrides cannot fix puppeteer-core's tree safely.
- **Hosted Lighthouse services** - external upload, rejected for this stage.
