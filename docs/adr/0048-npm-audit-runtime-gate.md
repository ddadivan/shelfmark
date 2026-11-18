# 0048. npm audit: the required gate blocks on run-time dependencies, the full tree warns

- Status: Accepted
- Date: 2026-11-18
- Source: issue #493; amends [0018](0018-ci-pipeline-and-main-ruleset.md) (the `--omit=dev` rule); related [0028](0028-lighthouse-ci-isolated-lockfile.md); `docs/PROJECT.md` 5.8, 9.5

## Context

- ADR 0018 made `npm-audit` a required check running `npm audit --audit-level=high` on the full tree, and forbade `--omit=dev`: dev tooling runs on the author's machine and in CI, where tokens live, so its advisories matter too. An unfixable advisory needed a new ADR (0028 was the first: Lighthouse CI moved to its own lockfile).
- On 2026-11-17 the picomatch advisory GHSA-fc5q-39xc-vjpf (ReDoS through repeated extglobs, high) was widened to every version, `<= 4.0.7`, with no patched release. picomatch comes only through build and test tooling: vite and vitest (via tinyglobby and fdir), `@angular/build`, `@angular-devkit`, nx, `@parcel/watcher`, Storybook. It is not reachable from the run-time dependencies of the web app or the API, and the patterns it matches come from our own config files, never from user input. Every PR into `stage` and `main` turned red with nothing to upgrade to; hotfix 2.1.1 (#491) had to be merged with a ruleset bypass.
- Advisories in dev tooling often stay unfixed for weeks, while upstream tools pin their own trees. The run-time tree (Angular, NestJS, Prisma, better-auth, express, Sentry, sharp, …) is what users' data passes through.
- Plain `npm audit --omit=dev` is not enough: better-auth lists vitest as an optional peer, so npm marks the whole vite / vitest chain `devOptional` and still reports it. `--omit=optional` would remove that chain but also sharp's native binaries (`@img/sharp-*`), which run in the API function.

## Decision

- The required `npm-audit` job runs `tools/ci/audit-runtime.mjs`: `npm audit --omit=dev --json`, then it fails on any high or critical advisory except in packages that the lockfile marks `dev` or `devOptional` at every place they are installed. Run-time packages, optional native binaries included, keep blocking the merge. The script lists what it left out in the job summary; `tools/ci/audit-runtime.test.mjs` covers the rule.
- The same job then runs `npm audit --audit-level=high` on the full tree with `continue-on-error`: dev tooling advisories stay visible on every run without blocking.
- Dependabot keeps opening update PRs and alerts for the whole tree, so a dev tooling fix still arrives as soon as upstream ships one.
- An advisory in a run-time package is fixed by upgrading or an exact `overrides` entry, never by changing the rule; an unfixable one still needs its own ADR.

## Consequences

- PRs are no longer blocked by advisories that cannot reach users and have no fix; the picomatch case passes the gate today.
- A serious advisory in dev tooling (for example a compromised build plugin) no longer stops a merge by itself. It shows as a warning in the `npm-audit` job and as a Dependabot alert; the author reviews them, and `security-reviewer` runs the full audit when dependencies change.
- The rule depends on npm's `dev` / `devOptional` flags in `package-lock.json`; if a tooling package becomes a real run-time dependency, its flag changes and it blocks again.

## Alternatives considered

- **Keep the full-tree gate and bypass the ruleset on every PR** — trains everyone to bypass the gate; rejected.
- **An allow-list of advisory ids with an expiry date** — stricter, but the next unfixable tooling advisory repeats the problem; kept as the fallback if this rule proves too loose.
- **`--omit=dev --omit=optional`** — passes today but drops sharp's native binaries from the gate.
- **Overriding picomatch to a fork** — an unreviewed fork in the build chain is a worse supply-chain risk than the ReDoS.
