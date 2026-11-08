# 0023. Storybook showcase hosting

- Status: Accepted
- Date: 2026-11-06
- Source: issue #21; [0013](0013-vercel-hobby-hosting.md), [0017](0017-libs-ui-foundation.md), [0019](0019-vercel-deployment-architecture.md), [0022](0022-csp-nonce-routing-middleware.md)

## Context

The component library has a Storybook (`@storybook/angular-vite`, ADR 0017). It should be published as a static showcase and checked in CI (build plus accessibility). Facts about the built output (`libs/ui/storybook-static`): `index.html` (manager) and `iframe.html` (preview) both contain inline `<script>` blocks with build-specific content, Storybook and the Angular components add `<style>` elements at runtime, and the manager embeds the preview in an iframe of the same origin. The site has no user data, no cookies, no API and no secrets.

The app's strict CSP (ADR 0019, 0022) cannot be reused as is: it forbids inline scripts and needs a per-request nonce from a middleware, which a static site does not have.

## Decision

- A second Vercel project `shelfmark-ui` (team `reacts-projects-581acec8`, Hobby) is built from the same repository with Root Directory `libs/ui`, "Include files outside the Root Directory in the Build Step" and "Skip deployments when there are no changes to the root directory or its dependencies" enabled, Framework Preset Other, Node 26.x, Vercel Authentication on previews, no environment variables. `libs/ui/vercel.json` has `ignoreCommand` `node ../../scripts/vercel-ignore-build.mjs --storybook`: the showcase is built only from `main`, and only when a merge changed a Storybook input (`libs/ui` outside its unit and a11y tests, or the root `package.json`, lockfile, `tsconfig.base.json`, `nx.json`, `.nvmrc`) (issue #50, Vercel Hobby deployment limit); pull requests are covered by the CI Storybook build and a11y run, and the app project keeps its PR previews.
- `libs/ui/vercel.json` holds its configuration. Install and build run from the workspace root (`cd ../.. && npm ci --include=dev`, `cd ../.. && npx nx build-storybook ui --output-style=static`); the output directory is `storybook-static`. Vercel reads only the `vercel.json` in the project's Root Directory, so the repository-root `vercel.json` and `middleware.ts` of `shelfmark-app` do not apply to this project.
- **CSP: a relaxed, fixed policy for this static, data-free site**, not build-time hashes: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; form-action 'self'`.
  - `'unsafe-inline'` for scripts is unavoidable without hashes: Storybook's inline bootstrap blocks change on every build and with addons, and hashing them needs a post-build step that rewrites `vercel.json`, a fragile coupling to Storybook internals. `'unsafe-eval'` is also required: Storybook's Angular renderer compiles its story wrapper component with the Angular JIT compiler (`new Function`); the framework option `jit: false` was tried and fails with "JIT compiler unavailable". Every story is loaded under exactly this policy in the a11y test, so a future need for more is caught.
  - The risk of `'unsafe-inline'` and `'unsafe-eval'` is XSS exfiltrating data or acting as a user. This origin has no session, no cookies and no data, and it is a separate `*.vercel.app` project from the app, so there is nothing to steal and no credentialed request to forge. Everything else stays strict (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, no remote origins).
  - `frame-ancestors 'self'` (not `'none'`) because the manager frames its own preview; no other origin may embed it.
- Other headers as for the app: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy` (camera, microphone, geolocation off), `Cross-Origin-Opener-Policy: same-origin`. Build assets are cached immutable.
- `dependabot/**` branches are not deployed (same as the app).
- **CI** builds Storybook when `ui` is affected and runs an accessibility check over the built site: `nx test-storybook ui` serves `storybook-static` with the headers from `libs/ui/vercel.json` and runs axe-core (WCAG A/AA and best-practice rules, including colour contrast) on every story and every docs page (auto-generated component docs and `Foundations/*`; on docs pages only, Storybook's JSON control `.rejt-tree` is excluded because its markup is not ours, and `landmark-unique` is off because autodocs renders the primary story twice) in both themes with Playwright and Chromium, failing on any CSP violation. That reuses Playwright and axe-core already in the repository instead of adding `@storybook/test-runner`, and the same run proves that the policy above does not break Storybook.
- **Speed and cache (issue #186).** The a11y spec is `fullyParallel` with 4 workers in CI (one per vCPU of the runner): each story page is independent and the static server is stateless, so the 654 checks no longer run serially (about 11 minutes before). The coverage is unchanged (every story and docs page, both themes, same axe rules). `build-storybook` and `test-storybook` take the project's `default` inputs (stories, `.storybook`, a11y spec, `vercel.json`) plus `^production` and the root `package.json`; the earlier inputs used `production`, which excludes `*.stories.*`, and listed the gitignored `storybook-static`, which Nx never hashes, so the cache key missed story changes. `test-storybook` also hashes the output files of the Storybook build. The task is still affected by any root `package.json` change (Nx maps it to every project); narrowing that was not done, because Nx offers no safe way to tell a Storybook, Angular or axe bump from an unrelated one.
- The `e2e` job runs the Storybook a11y check, so it rebuilds Storybook (a separate Nx cache from `lint-test-build`, a few seconds); accepted over sharing artifacts between jobs.
- A post-deploy smoke workflow checks the production app (the CSP nonce, `/missing.js`, `/api/health`), as required by ADR 0022.

## Consequences

- Storybook is published on merges to `main` that change a Storybook input; other merges and all pull requests skip the deployment, so a merge that does not touch the library no longer holds the single Hobby build slot after the app's production build. Pull requests are covered by the CI build and a11y run.
- Changing `libs/ui/vercel.json` headers is covered by the same Storybook test run, since the test server reads the headers from it.
- If Storybook ever loads anything from a remote origin (fonts, analytics) the policy and this ADR must be updated; today everything is self-hosted.
- If the showcase ever gets authenticated or personal content, revisit hashes or a nonce.

## Alternatives considered

- **Build-time hashes** for inline scripts: stricter, but Storybook inlines runtime-injected styles as well, so `style-src` would still need `'unsafe-inline'`; the benefit is small for a data-free site and the build coupling is fragile.
- **Copy the app CSP**: blocks the manager and the preview outright.
- **`@storybook/test-runner`**: one more dependency and a Jest stack; Playwright and axe-core are already installed.
- **A subpath of `shelfmark-app`**: would put relaxed headers and a large static bundle next to the app and its middleware.
