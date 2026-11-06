# 0023. Storybook showcase hosting

- Status: Accepted
- Date: 2026-11-06
- Source: issue #21; [0013](0013-vercel-hobby-hosting.md), [0017](0017-libs-ui-foundation.md), [0019](0019-vercel-deployment-architecture.md), [0022](0022-csp-nonce-routing-middleware.md)

## Context

The component library has a Storybook (`@storybook/angular-vite`, ADR 0017). It should be published as a static showcase and checked in CI (build plus accessibility). Facts about the built output (`libs/ui/storybook-static`): `index.html` (manager) and `iframe.html` (preview) both contain inline `<script>` blocks with build-specific content, Storybook and the Angular components add `<style>` elements at runtime, and the manager embeds the preview in an iframe of the same origin. The site has no user data, no cookies, no API and no secrets.

The app's strict CSP (ADR 0019, 0022) cannot be reused as is: it forbids inline scripts and needs a per-request nonce from a middleware, which a static site does not have.

## Decision

- A second Vercel project `shelfmark-ui` (team `reacts-projects-581acec8`, Hobby) is built from the same repository with Root Directory `libs/ui`, "Include files outside the Root Directory in the Build Step" and "Skip deployments when there are no changes to the root directory or its dependencies" enabled, Framework Preset Other, Node 26.x, Vercel Authentication on previews, no environment variables.
- `libs/ui/vercel.json` holds its configuration. Install and build run from the workspace root (`cd ../.. && npm ci --include=dev`, `cd ../.. && npx nx build-storybook ui --output-style=static`); the output directory is `storybook-static`. Vercel reads only the `vercel.json` in the project's Root Directory, so the repository-root `vercel.json` and `middleware.ts` of `shelfmark-app` do not apply to this project.
- **CSP: a relaxed, fixed policy for this static, data-free site**, not build-time hashes: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; base-uri 'self'; frame-ancestors 'self'; object-src 'none'; form-action 'self'`.
  - `'unsafe-inline'` for scripts is unavoidable without hashes: Storybook's inline bootstrap blocks change on every build and with addons, and hashing them needs a post-build step that rewrites `vercel.json`, a fragile coupling to Storybook internals. `'unsafe-eval'` is also required: Storybook's Angular renderer compiles its story wrapper component with the Angular JIT compiler (`new Function`); the framework option `jit: false` was tried and fails with "JIT compiler unavailable". Every story is loaded under exactly this policy in the a11y test, so a future need for more is caught.
  - The risk of `'unsafe-inline'` and `'unsafe-eval'` is XSS exfiltrating data or acting as a user. This origin has no session, no cookies and no data, and it is a separate `*.vercel.app` project from the app, so there is nothing to steal and no credentialed request to forge. Everything else stays strict (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, no remote origins).
  - `frame-ancestors 'self'` (not `'none'`) because the manager frames its own preview; no other origin may embed it.
- Other headers as for the app: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy` (camera, microphone, geolocation off), `Cross-Origin-Opener-Policy: same-origin`. Build assets are cached immutable.
- `dependabot/**` branches are not deployed (same as the app).
- **CI** builds Storybook when `ui` is affected and runs an accessibility check over the built site: `nx test-storybook ui` serves `storybook-static` with the headers from `libs/ui/vercel.json` and runs axe-core (WCAG A/AA and best-practice rules, including colour contrast) on every story and every `Foundations/*` docs page in both themes (auto-generated component docs pages only re-render the component stories, which are checked directly) with Playwright and Chromium, failing on any CSP violation. That reuses Playwright and axe-core already in the repository instead of adding `@storybook/test-runner`, and the same run proves that the policy above does not break Storybook.
- The `e2e` job runs the Storybook a11y check, so it rebuilds Storybook (a separate Nx cache from `lint-test-build`, a few seconds); accepted over sharing artifacts between jobs.
- A post-deploy smoke workflow checks the production app (the CSP nonce, `/missing.js`, `/api/health`), as required by ADR 0022.

## Consequences

- Storybook is published on every merge to `main` and on every pull request that changes `libs/ui` or its dependencies; unaffected pull requests skip the deployment.
- Changing `libs/ui/vercel.json` headers is covered by the same Storybook test run, since the test server reads the headers from it.
- If Storybook ever loads anything from a remote origin (fonts, analytics) the policy and this ADR must be updated; today everything is self-hosted.
- If the showcase ever gets authenticated or personal content, revisit hashes or a nonce.

## Alternatives considered

- **Build-time hashes** for inline scripts: stricter, but Storybook inlines runtime-injected styles as well, so `style-src` would still need `'unsafe-inline'`; the benefit is small for a data-free site and the build coupling is fragile.
- **Copy the app CSP**: blocks the manager and the preview outright.
- **`@storybook/test-runner`**: one more dependency and a Jest stack; Playwright and axe-core are already installed.
- **A subpath of `shelfmark-app`**: would put relaxed headers and a large static bundle next to the app and its middleware.
