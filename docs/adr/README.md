# Architecture decision records

An ADR is a short file that records one significant decision: the context that forced it, what we decided, what follows from it and which options we rejected. `docs/PROJECT.md` says *what* Shelfmark is; ADRs say *why* the code is built the way it is (PROJECT.md 8.3).

## When to write one

Write an ADR when a change:

- picks or replaces a framework, library, runtime or build tool;
- changes project boundaries, the build, deployment or the API contract style;
- sets a cross-cutting rule (security, typing, testing, styling);
- deviates from the default route of a tool (e.g. a hand-written Nx target instead of a plugin).

Routine features, bug fixes and choices already fully covered by an existing ADR do not need one. The `architect` writes the ADR while planning the task; it is merged in the same PR as the change.

## How

- Copy [`0000-template.md`](0000-template.md) to `NNNN-kebab-title.md`, the next free four-digit number. Numbers are never reused.
- Keep it under one page: Context, Decision, Consequences, Alternatives considered. Facts and sources (issue, PR, PROJECT.md section) only.
- Status: `Proposed` while in review, `Accepted` when merged. An accepted ADR is not rewritten; a changed decision gets a new ADR, and the old one is marked `Superseded by NNNN`.
- Add a row to the index below.

## Index

| # | Decision | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-nx-monorepo-and-dependency-pinning.md) | Nx monorepo, single package.json, npm, path aliases, exact pins | Accepted | 2026-11-04 |
| [0002](0002-node-26-lts-runtime.md) | Node 26 LTS runtime, engine-strict | Accepted | 2026-11-04 |
| [0003](0003-tooling-guardrails.md) | Tooling guardrails: ESLint boundaries, Prettier, stylelint, lefthook + gitleaks | Accepted | 2026-11-04 |
| [0004](0004-strict-typescript.md) | Strict TypeScript and one type per file | Accepted | 2026-11-04 |
| [0005](0005-web-csr-zoneless-angular.md) | Web: CSR-only zoneless Angular 22, Transloco static loader, strict-CSP build | Accepted | 2026-11-04 |
| [0006](0006-api-nestjs-build-and-tests.md) | API: NestJS 12 ESM, webpack build, SWC in tests | Accepted | 2026-11-04 |
| [0007](0007-api-security-baseline.md) | API security baseline: no CORS, helmet, ApiError, request id, env config | Accepted | 2026-11-04 |
| [0008](0008-e2e-playwright-chromium.md) | E2E: Playwright, Chromium only in stage 0 | Accepted | 2026-11-04 |
| [0009](0009-angular-22-and-ngrx-signalstore.md) | Angular 22 with NgRx SignalStore, no classic NgRx Store | Accepted | 2026-11-05 |
| [0010](0010-nestjs-backend.md) | NestJS as the backend framework | Accepted | 2026-11-05 |
| [0011](0011-postgresql-neon-prisma.md) | PostgreSQL on Neon with Prisma | Accepted | 2026-11-05 |
| [0012](0012-better-auth-oauth.md) | Better Auth with Google and GitHub OAuth, cookie sessions | Accepted | 2026-11-05 |
| [0013](0013-vercel-hobby-hosting.md) | Vercel Hobby hosting: static web, API as one function, preview deploys | Accepted | 2026-11-05 |
| [0014](0014-own-ui-library-angular-aria-cdk.md) | Own UI library on Angular Aria / CDK, tokens, Storybook | Accepted | 2026-11-05 |
| [0015](0015-rem-units-and-em-breakpoints.md) | rem units and em breakpoints, px exceptions | Accepted | 2026-11-05 |
| [0016](0016-claude-code-subagents-and-human-reviewed-prs.md) | Claude Code subagents with human-reviewed PRs | Accepted | 2026-11-05 |
| [0017](0017-libs-ui-foundation.md) | libs/ui foundation: Storybook on Vite, tokens, self-hosted fonts, SVG sprite | Accepted | 2026-11-05 |
| [0018](0018-ci-pipeline-and-main-ruleset.md) | CI pipeline, required checks and the `main` ruleset | Accepted | 2026-11-05 |
| [0019](0019-vercel-deployment-architecture.md) | Vercel deployment: static web, API function, headers/CSP, CLI secret policy | Proposed | 2026-11-05 |
| [0020](0020-npm-install-scripts-policy.md) | npm install-scripts policy: deny by default, per-package review | Accepted | 2026-11-05 |
| [0021](0021-ui-button-wrapper-and-trigger-api.md) | ui-button stays a wrapper; trigger API (ARIA, focus target, href) and uiRipple | Accepted | 2026-11-05 |
