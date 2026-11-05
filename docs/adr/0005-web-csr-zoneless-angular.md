# 0005. Web: CSR-only zoneless Angular 22

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 5.1, 5.8, 7

## Context

`apps/web` is an authenticated app behind a session cookie, plus a public landing page. PROJECT.md 5.1 requires Angular 22 without legacy (standalone, zoneless, signals) and all UI text through Transloco; 5.8 requires a Content-Security-Policy. Light and dark themes must both work (CLAUDE.md, PROJECT.md 7).

## Decision

- **CSR only in stage 1**: no SSR, no hydration; prerendering the landing page is in the backlog. The app is static files on Vercel.
- **Zoneless**: `provideZonelessChangeDetection`; `zone.js` is not a dependency and is banned by lint. Standalone components, OnPush, signals; app component prefix `app-`.
- **Unit tests via `@angular/build:unit-test`** (Vitest, jsdom), the official Angular builder. `typecheck` runs `ngc --noEmit` so templates are checked.
- **Transloco** with a **static bundled loader**: `en` only, lazy `import('./en.json')` per language, no HTTP request; unknown languages are rejected (own keys only); `fallbackLang: 'en'`, `failedRetries: 0`.
- **Strict-CSP-friendly build**: nothing inline in `index.html`; `optimization.styles.inlineCritical: false` and `optimization.fonts: false` (no inlined critical CSS, no inlined font CSS). The Onest font is self-hosted (`font-src 'self'`, libs/ui task). The CSP header itself is set at deploy time (deploy task).
- **Theme via `html[data-theme]`** and `color-scheme`, owned only by `ThemeService` (`system | light | dark`, persisted in `localStorage` `sm-theme`). Because there is no inline script, a user with an explicit light choice on a dark system may see a brief theme flash; accepted.
- HTTP uses relative `/api` (same origin, [0007](0007-api-security-baseline.md)); dev server proxies `/api` to `http://localhost:3000`.

## Consequences

- Simple hosting and a strict CSP without nonces or hashes.
- No server rendering for SEO or first paint; revisit if the landing page needs it (backlog).
- One test runner (Vitest) for web, api and ui, driven by the Angular CLI's own builder.
- Adding a language is a new JSON file plus one loader entry, no backend change.

## Alternatives considered

- **SSR / hydration** — server runtime and cookie handling for little stage-1 benefit.
- **Analog (`@analogjs/vitest-angular`) for unit tests** — third-party plugin; the official builder covers Vitest.
- **Transloco HTTP loader** (`/assets/i18n/*.json`) — an extra request on start and a separate asset path.
- **Inline theme script in `index.html`** — removes the flash but breaks strict CSP.
