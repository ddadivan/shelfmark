## What

<!-- One or two sentences: what changed and why. -->

<!-- PRs into stage: Refs #N (the release PR stage → main lists Closes #N for every issue). -->

Refs #

## How to verify

<!-- Commands to run, URLs to open (Vercel preview), screens to compare with docs/design. -->

1.

## Checklist

- [ ] Branch and commits follow Conventional Commits (`feat/<issue>-…`, `fix/…`)
- [ ] Lint, typecheck, tests and build pass (`nx affected`)
- [ ] Coverage thresholds hold (≥ 80% for `apps/api`, `libs/ui`)
- [ ] Security items from PROJECT.md 5.8 that apply are covered
- [ ] UI: only `libs/ui` components, tokens, `rem`; light and dark theme; phone layout; matches docs/design
- [ ] UI text goes through translation keys
- [ ] No secrets, `.env` files or personal data in the diff
