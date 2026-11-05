# 0003. Tooling guardrails: ESLint, Prettier, stylelint, lefthook + gitleaks

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 5.0, 5.8, 7, 8.5

## Context

Most code is written by agents, so project rules must be enforced by tools, not only by review: module boundaries between web, api and shared libs; sizes in `rem` and breakpoints in `em` (CLAUDE.md, PROJECT.md 7); no secrets in commits (PROJECT.md 5.8, 8.5). The repository is public.

## Decision

- **ESLint 10, flat config** (`eslint.config.mjs`, `@nx/eslint-plugin` presets + `eslint-config-prettier`). `@nx/enforce-module-boundaries` with tags:
  - scope: `scope:web` and `scope:api` may depend only on themselves and `scope:shared`; `scope:shared` only on `scope:shared`;
  - type: `type:app` → `type:ui`, `type:contracts`; `type:ui` → `type:ui`, `type:contracts`; `type:contracts` → `type:contracts`.
  - Projects add their own rules (angular-eslint, bans in `apps/web`). `docs/**` is ignored.
- **Prettier 3** formats code, `.claude/`, `.github/` and `CLAUDE.md`; **all of `docs/**` is ignored** (hand-written documents and design exports).
- **stylelint 17** (`stylelint-config-standard-scss`): `px` forbidden except border widths, `outline` / `outline-width` / `outline-offset`, `box-shadow`, and inside `rem()`; media `width` / `height` only in `em`. Runs as `npm run lint:styles`, a separate CI step (CI task).
- **lefthook pre-commit**, sequential: `gitleaks git --staged --redact` (**fails closed**: the commit is rejected with an install hint if gitleaks is missing, `brew install gitleaks`), then stylelint and `prettier --check` on staged files. `.gitleaks.toml` extends the defaults with anchored allowlist paths. The same scan runs in CI (CI task).
- Hooks are never bypassed: `--no-verify` is blocked by `.claude/hooks/guard.mjs`.

## Consequences

- A wrong import direction, a `px` padding or a leaked token fails locally before review.
- Every new project must carry `scope:*` and `type:*` tags, or boundary rules cannot place it.
- Every machine that commits needs gitleaks installed; this is intentional friction.
- Markdown in `docs/` is not auto-formatted; authors keep it tidy by hand.

## Alternatives considered

- **Legacy `.eslintrc`** — deprecated; ESLint 10 is flat-config only.
- **Husky + lint-staged** — two tools for what lefthook does in one config.
- **gitleaks only if installed (fail open)** — a missing binary would silently disable the secret check.
- **Prettier on `docs/**`** — would reflow the project document and design exports.
- **stylelint inside `nx lint`** — the author chose a separate `npm run lint:styles` step (stage 0 plan).
