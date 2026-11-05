# 0008. E2E: Playwright, Chromium only in stage 0

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 9.4

## Context

PROJECT.md 9.4 requires Playwright e2e for key scenarios on phone and desktop; the UI must work from 360px (CLAUDE.md). Stage 0 has only a smoke test, and CI time and browser downloads are a cost on every PR.

## Decision

- `apps/web-e2e` with **Playwright** (1.64), **Chromium only** in stage 0.
- Two projects: **`desktop`** and **`phone`** (Pixel 7 profile at **360 × 780**).
- CI mode serves the **production build** with `retries: 2` and `forbidOnly`; locally `nx serve web` is used (an already running server is reused). `E2E_PORT` overrides the port.
- The smoke test checks a translated `h1`, `html[data-theme]`, no `window.Zone`, no console errors and no horizontal scroll at 360px.

## Consequences

- Fast, cheap e2e runs; one browser to install (`npx playwright install chromium`).
- Safari / WebKit-specific bugs are not caught yet; WebKit is added later (stage 0 plan).
- Every future e2e scenario runs on both desktop and phone.

## Alternatives considered

- **Chromium + Firefox + WebKit from the start** — triples run time for a smoke test.
- **Cypress** — PROJECT.md fixes Playwright, which also provides the Playwright MCP used by agents (8.6).
