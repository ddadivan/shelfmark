# 0035. `stage` integration branch, release PR into `main`, To release column

- Status: Accepted
- Date: 2026-11-10
- Source: issue #260; `docs/PROJECT.md` 8.2, 9.3, 9.5; builds on [0018](0018-ci-pipeline-and-main-ruleset.md), [0019](0019-vercel-deployment-architecture.md), [0025](0025-database-tooling-prisma-7-pglite.md)

## Context

In stage 1 every PR went straight into `main`, and every merge deployed to production. Stage 2 changes a lot at once (the 2027 Refresh redesign, then about twenty features), and the author uses production every day. Production should change in one planned step at the end of a stage, after the author has checked the whole stage locally, not after every PR. The project has no budget for a second hosted environment, and the Hobby plan and the free Neon project should stay as they are ([0013](0013-vercel-hobby-hosting.md)).

## Decision

1. **Branches.** `main` is production. `stage` is the integration branch of the current stage, created from `main`. Every task branches from fresh `stage` (`feat/<N>-short`, `fix/…`, `docs/…`, `chore/…`, `ci/…`, `test/…`) and its PR targets `stage`, squash merge. Branching from `main` and merging into `stage` is avoided: the branch would not see what is already in `stage`, and CI would test code that differs from what lands.
2. **Dependent tasks.** A task that needs another task's unmerged work starts from that branch; its PR still targets `stage` and says "Merge after #N". A branch is brought up to date by merging `origin/stage` into it; branches with an open PR are never rebased or force-pushed.
3. **Issue references.** PRs into `stage` say `Refs #N`, not `Closes #N`: closing keywords only act on the default branch, and the issue must stay open until its code reaches production.
4. **Release.** At the end of a stage a release PR `stage → main` ("Release: stage N") lists `Closes #N` for every issue of the stage. The author merges it with a merge commit, so `main` keeps the individual squashed commits. The merge deploys to Vercel production and applies the Prisma migrations to the production database (ADR 0025).
5. **Hotfix.** A production fix branches from `main`, its PR targets `main`, and `main` is then merged back into `stage` through a PR.
6. **No staging environment.** Nothing deploys from `stage`: branch deployments stay off in `vercel.json`, Vercel builds production only from `main`. The stage is checked locally (`npm start`, on a phone over the local network). A staging URL can be enabled later by allowing the `stage` branch in `vercel.json`; the Neon integration then creates its database branch, and OAuth needs the preview callback set-up from [0026](0026-oauth-on-preview-deployments.md).
7. **CI.** The CI workflow runs on PRs into `main` and `stage` and on pushes to both (#219). The `stage` ruleset mirrors the `main` ruleset of ADR 0018 (PR only, the four required checks, no force-push or deletion); the author sets it up, and allows merge commits on `main` for the release PR.
8. **Board.** A **To release** column sits between In review and Done. The board workflow "Pull request merged" moves the card to To release when its PR merges into `stage`; the release PR closes the issue, and "Item closed" moves it to Done. Cloud sessions cannot call GraphQL, so they report the moves instead of making them.
9. **Guardrails.** The guard hook blocks commits on `main` and `stage` and pushes to either. Dependabot version updates target `stage` (`target-branch`); security updates still open against the default branch and are handled as hotfixes or re-targeted.

## Consequences

- Production changes rarely and in one reviewed step; the author keeps using a stable app while a stage is built.
- Problems that only show in the cloud (Vercel function boot, production migrations, OAuth callbacks) surface at the release, not per PR. The release PR runs the full CI, and the production e2e of the public specs runs after it deploys; a staging URL (point 6) is the fallback if this hurts.
- Issues stay open longer and the board has one more column; the release PR body is the list of what ships.
- `main` gets merge commits for releases; the linear-history rule of ADR 0018 applies to `stage` instead.

## Alternatives considered

- **Keep merging into `main`** - every PR reaches production before the author has checked the stage as a whole.
- **A staging environment from the start** - another database branch and OAuth set-up for one person's checks; can be added later (point 6).
- **Long-lived feature branches merged into `main` one by one** - the features of stage 2 touch the same files, so they would conflict and never be tested together.
