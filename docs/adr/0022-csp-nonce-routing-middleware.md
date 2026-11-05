# 0022. CSP nonce through Vercel Routing Middleware

- Status: Proposed
- Date: 2026-11-05
- Source: issue #9; `docs/PROJECT.md` 5.8; `docs/SETUP.md` 5.6; [0019](0019-vercel-deployment-architecture.md), [0005](0005-web-csr-zoneless-angular.md), [0014](0014-own-ui-library-angular-aria-cdk.md)

## Context

Angular adds component styles (`libs/ui`, CDK overlays) at runtime as `<style>` elements, and the strict policy `style-src 'self'` from ADR 0019 blocks them. `'unsafe-inline'` is ruled out by `docs/SETUP.md` 5.6. Angular supports a per-request nonce through the `ngCspNonce` root attribute, but a static deployment cannot produce a fresh value per request. The author decided in ADR 0019 that a Vercel Routing Middleware does it.

## Decision

- A root `middleware.ts` (runtime `edge`, Web APIs only) handles GET/HEAD requests for HTML document paths:
  - `/`;
  - extensionless paths outside `/api`;
  - `/index.html`.

  For each request it creates a 16-byte random nonce (base64), replaces the `ngCspNonce` placeholder in the app shell and answers with `Content-Security-Policy: buildCsp(nonce)` (`style-src 'self' 'nonce-…'`) and `Cache-Control: private, no-store`. Every other request continues untouched, so assets and `/api/*` cost no invocation.
- The app shell is bundled into the middleware: a post-build target writes the built `index.html` as a JS module, and Vercel's bundler inlines it. There is no fetch to the origin, which would add latency, loop through the matcher and fail with 401 on protected previews.
- Logic lives in the tested lib `libs/web/csp`. The root file keeps only the static `config` and the wiring, the same pattern as `api/index.mjs`.
- One CSP source: `buildCsp()` in the lib. `vercel.json` keeps the nonce-less policy only for file-like non-API paths (a checked copy), so two policies never apply to one response and anything served as a file stays strict. An e2e config test enforces that the copies match.
- Fail closed: the build fails, and the middleware throws at init, when the placeholder is missing.
- Test page: a hidden `/__e2e/csp` route (`ui-button`, `ui-icon`, a CDK overlay) exists only in an `e2e` build configuration that swaps the route table by file replacement. CI serves that configuration; the production build does not contain the route, and a test checks the production output for the `__e2e` string.

## Alternatives considered

- **`'unsafe-inline'` in `style-src`**: rejected by SETUP 5.6.
- **Hash-based CSP / Angular `autoCsp`**: covers inline scripts in `index.html` only, not runtime component styles.
- **Fetching `/index.html` from the origin inside the middleware**: an extra hop, loop risk, and it breaks on previews behind Vercel Authentication.
- **SSR or a function serving the shell**: SSR contradicts ADR 0005 (CSR), and a Node function has a cold start and a single region for every navigation.
- **Global styles only, no component styles**: rejected, it gives up Angular view encapsulation for the whole UI library.
- **A hidden test route in the production app**: simpler, but it ships.

## Consequences

- Every document load runs one edge middleware invocation (well within Hobby limits); SPA navigation does not.
- HTML is never cached (`no-store`), and Chrome may skip the back-forward cache for it.
- Local `nx serve` and the CI static server send no CSP. The CSP e2e test runs the real middleware handler inside the Playwright route, and the deployed-URL test checks the real header.
- CI tests a build that differs from production only by the `/__e2e/csp` route.
- These Vercel behaviours are observed on the preview, not documented, and must be re-checked after changes: middleware bundling after `buildCommand`, `vercel.json` headers on middleware responses, and the matcher regex.
- Switching to `runtime: 'nodejs'` is a one-line change if edge middleware is deprecated.
