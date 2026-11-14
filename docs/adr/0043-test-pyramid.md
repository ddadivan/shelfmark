# 0043. Test pyramid: e2e for journeys, tagged mobile runs, component tests with harnesses

- Status: Accepted (by the author, Nov 13, 2026)
- Date: 2026-11-13
- Source: issue #349, `docs/PROJECT.md` 9.4 and 9.5, plan in [`docs/test-rebalance-349.md`](../test-rebalance-349.md); partly supersedes [ADR 0008](0008-e2e-playwright-chromium.md) ("every future e2e scenario runs on both desktop and phone")

## Context

- `apps/web-e2e` has 57 specs and 710 tests. Every test runs on three Playwright projects: desktop, tablet (820×1180, touch) and phone (360×780, touch).
- The last full run executed 1698 tests (333 more skipped themselves), 0 of them flaky.
- That run cost 5657 worker-seconds, 5.4–7.5 minutes per shard across 4 shards.
- About 60% of the tablet and phone runs repeat desktop:
  - tests that set their own viewport run the same in every project;
  - feature logic has no layout branch.
- axe scans are 34% of the time (light + dark × 3 projects).
- About 5000 unit tests (Vitest, TestBed, jsdom) already cover much of the single-component logic that e2e checks again.
- Contract tests (#341) and visual regression (#340, tablet and phone included) exist.
- The author wants CI to be fast: a full e2e run under ~3 minutes, almost no flakes, no loss of real coverage.

## Decision

- **Layers.**
  - **Unit / component tests**: TestBed, `fixture.whenStable()`, Vitest fake timers instead of waits, `HttpTestingController`. They own single-component logic, keyboard handling inside one component, error and empty states, and timing rules.
  - **Contract tests** own API shapes.
  - **Visual regression** owns layout and geometry.
  - **Storybook axe** owns libs/ui components.
  - **E2e** owns user journeys across pages and stores, real-browser-only behaviour (drag, touch, CSP, service worker, tab sync, layout shift), and axe on key app screens.
- **Projects.** `desktop` runs the full e2e set. `tablet` runs only tests tagged `@mobile` or `@tablet`. `phone` runs only tests tagged `@mobile` or `@phone`. The tags are `E2E_TAG` (`apps/web-e2e/src/models/e2e-tag.const.ts`), applied through Playwright's `tag` option. Each project selects its tests with `grep`.
- **Tagging rule.**
  - `@phone`: the path exists only below 64em or with touch (tab bar, sheets, long press, swipe, You tab), or the test is a core journey whose UI differs in the mobile shell.
  - `@mobile`: the iPad layout matters too.
  - A test that sets its own viewport is never tagged, because it would only repeat. The one exception: a test that needs the touch device and skips itself on desktop (the overflow and fit matrix in `mobile.spec.ts`) gets `@phone`, so it runs exactly once.
  - A test that branches on `isCompact` / `isPhone` / `hasTouch` needs a tag; code review checks it.
- **Removal rule.** An e2e test is removed only when a lower-level spec covers the same behaviour. The PR that removes it names that spec.
- **Harnesses.** Angular CDK component harnesses for the main libs/ui components (button, menu, select, dialog / sheet, tree, card, command-list, tag-input, choice-grid, color-picker) live next to each component in `testing/`. Only component tests use them (phase 2). E2e stays on role-based locators (see Alternatives).
- **CI.**
  - Web e2e runs in 5 shards while phase 1 is in place and in 3 after the phase 3 cut to journeys (#349). CI retries go from 2 to 1.
  - The Storybook axe run is split into 3 Playwright shards.
  - The required `lint-test-build` check becomes an aggregate of parallel jobs: `static` (format, styles, scripts, lint), `build` (typecheck, builds, bundle and migration checks, Storybook build) and a `unit` matrix (the API suite in 2 Vitest shards, the web app, the other libraries). The aggregate merges the API shards and checks the API coverage thresholds on the whole suite. Everything keeps `nx affected` semantics.
  - Target: every required check in about 4 minutes.

## Consequences

- Phase 1 cuts the executed runs from 1698 to ~756 and the time per shard from ~5.9 to ~2.3 minutes (5 shards).
- Later phases aim at ~150 journeys and ~250 runs.
- Phone and tablet no longer repeat feature flows that share code with desktop. A phone-only regression in such a flow is caught by visual regression, the overflow matrix or the tagged journeys, not by a full repeat. A missing tag is the main new risk, so code review checks every branch on `isCompact` / `isPhone` / `hasTouch`.
- A UI tweak breaks fewer e2e tests. Component tests with harnesses do not depend on DOM structure or CSS classes.
- The Storybook axe entry and `lint-test-build` (~7.5 min each before) are split in the same change, so the CI wall drops to about 4 minutes, bounded by the web e2e shards. Two more runners per run (8 browser entries, 4 unit entries, 2 static and build jobs); runners are free on a public repository.
- Revisit if phone-only bugs start reaching `stage` unnoticed: add tags, or a nightly full three-project run.

## Alternatives considered

- **Keep three full projects, add shards (8–10).** This cuts wall time but keeps the cost, the duplication and the flake surface. It does nothing about maintenance.
- **Phone only, drop the tablet project.** The tablet catches the 2–3 column iPad layout and the centred tab bar (#316). A small tagged set keeps that coverage at ~2 minutes of worker time.
- **Nightly full run instead of tags.** It needs a schedule and someone to triage it. Tags keep every PR honest. It stays an option if tags miss bugs.
- **CDK harnesses in Playwright through a custom `HarnessEnvironment` adapter.** One set of selectors for both layers, but code with no official support to maintain. The e2e suite already uses role-based locators that do not depend on DOM structure. Rejected (decision D6).
- **Vitest shards for every project, merged in one coverage job.** Only the API suite is long enough to need it; the web app and the libraries fit one runner each.
