# 0017. libs/ui foundation: Storybook on Vite, tokens, fonts and icon sprite

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 5.8, 7; ADR 0014, 0015

## Context

ADR 0014 chose an own component library. The libs/ui skeleton task builds it: build setup, design tokens with light and dark themes, fonts, icons, Storybook, and the first components (`ui-icon`, `ui-button`). The web app runs under a strict CSP (no inline styles or scripts), so fonts and icons must be same-origin files.

## Decision

- **Storybook on Vite**: `@storybook/angular-vite` (10.6.5) with the Analog Vite plugin; it runs Angular 22 zoneless. Addons: a11y, themes, docs. The webpack-based `@storybook/angular` was not needed.
- **Library shape**: `libs/ui` is a buildable ng-packagr library (`nx build ui`) but `apps/web` consumes it from source through the `@shelfmark/ui` path alias, so there is no publish step and no stale build. Tests run through `@angular/build:unit-test` (Vitest) with an 80% coverage gate.
- **Tokens as CSS custom properties** (`docs/design/tokens.css` as the source), generated from Sass mixins: scale tokens on `:root`, light on `:root, [data-theme='light']`, dark on `[data-theme='dark']` and under `prefers-color-scheme: dark` for `:root:not([data-theme])`. An explicit `data-theme` wins over the OS setting. Spacing and radii are converted to rem with `rem($px)`.
- **Self-hosted font**: Onest through `@fontsource-variable/onest` (SIL OFL 1.1), bundled by the build with hashed woff2 files; no Google Fonts request. JetBrains Mono is deferred; `--font-mono` falls back to `ui-monospace`.
- **External SVG sprite**: icons are one `sprite.svg` served as `/assets/ui/icons/sprite.svg` and referenced with `<use href>`, not inlined, so the CSP needs no `unsafe-inline`. Icons are filled outlines coloured by `currentColor`; the two sign-in brand marks `google` and `github` are the exception (fixed brand fills allowed, confined to the sprite). `ICON_NAMES` mirrors the sprite and a test keeps them equal.
- **Build config**: a single root `overrides` entry pins `vite` to 8.3.5 so Storybook, Analog and Angular share one Vite and the audit stays clean. `optimization.styles.inlineCritical` stays `false` and `fonts` off for the web build (CSP).
- Scarf analytics (a postinstall of `@scarf/scarf`, pulled in by Storybook) is disabled with `scarfSettings.enabled: false` in the root `package.json`; Storybook telemetry is off in `.storybook/main.ts`.
- Angular security lint rules are shared between `apps/web` and `libs/ui` in `eslint.angular.mjs`.

## Consequences

- One component source for the app and Storybook; changing a token changes both themes everywhere.
- Adding an icon means editing the sprite and `ICON_NAMES` together (documented in `libs/ui/CLAUDE.md`).
- The `vite` override must be revisited when Angular or Storybook move to a newer Vite.
- `@angular/animations` is installed only as a required peer of Storybook's Angular integration; it is never imported (lint-enforced).

## Alternatives considered

- **Webpack-based `@storybook/angular`** — slower, and a second bundler next to the Angular esbuild/Vite builds; kept as the fallback only.
- **Publishing `libs/ui` as a package** — adds versioning for a single consumer.
- **Inline sprite in `index.html`** — needs inline markup or `unsafe-inline` under the strict CSP, and bloats the document.
- **Google Fonts** — third-party request and privacy cost.
