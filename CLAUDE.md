# Shelfmark

Personal, responsive web app that keeps every saved link in one place: paste a URL, get a preview, organise with nested folders, tags and favorites, find it again with search. Stage 1 is a public portfolio project.

**Source of truth:** [`docs/PROJECT.md`](docs/PROJECT.md) — scope, stories with acceptance criteria (4), stack (5), security (5.8), data model and API (6), design (7), agent team (8), process (9). Read the relevant section before any task. If code and the document disagree, stop and ask.

**Design source of truth:** [`docs/design/`](docs/design/README.md) — start with `README.md`, then `BRAND.md`, the component spec in `components/<Name>/README.md`, `components/Motion/README.md` for any animation, and `screens/*.dc.html` for layout and copy. This is the Shelfmark 2027 Refresh; the migration plan is `docs/design/MIGRATION.md`. [`docs/design-v1/`](docs/design-v1/README.md) is the stage 1 design, kept for reference during the migration only — never build from it.

**Decisions:** [`docs/adr/`](docs/adr/) — one file per significant decision.

## Language

- Code, comments, docs, commits, issues, PRs: **English**.
- UI text: English, always through translation keys (Transloco), never hard-coded in templates.

## Stack

TypeScript 6.0 everywhere · Nx monorepo · Angular 22 (standalone, zoneless, signals, Signal Forms, NgRx SignalStore, Angular Aria / CDK) · NestJS · PostgreSQL (Neon) + Prisma · Better Auth (Google, GitHub) · Vercel · Vitest · Playwright · Storybook.

## Monorepo

| Project                 | What                                                        | Rules                                      |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `apps/web`              | Angular app; features live in `apps/web/src/app/features/*` | [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) |
| `apps/web-e2e`          | Playwright e2e (desktop, tablet, phone)                     |                                            |
| `apps/api`              | NestJS REST API under `/api`                                | [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) |
| `libs/ui`               | Own component library, tokens, Storybook                    | [`libs/ui/CLAUDE.md`](libs/ui/CLAUDE.md)   |
| `libs/shared/contracts` | DTOs and types shared by web and api                        | contract first: change here before code    |

## Commands

Node 26 LTS is required (`nvm use` reads `.nvmrc`). The pre-commit hook (lefthook) runs gitleaks, so install it once: `brew install gitleaks` (version 8.25 or newer is required, update with `brew upgrade gitleaks`); without it commits fail. One-time manual setup (local machine, Neon, OAuth apps, Vercel, secrets) is in [`docs/SETUP.md`](docs/SETUP.md) — the author does those steps, never an agent.

```bash
npm ci                                   # install
npm start                                # web on http://localhost:4200 (npx nx serve web; mock APIs)
npm run start:api                        # api on http://localhost:3000/api (npx nx serve api)
npm run start:all                        # web + api together (npx nx run-many -t serve -p web api)
npm run lint:styles                      # stylelint on css/scss (rem/em rules)
npm run format:check                     # prettier check
npm run affected                         # what CI runs (npx nx affected -t lint typecheck test build)
npm test                                 # all unit tests (npx nx run-many -t test)
npx nx test <project> --coverage         # unit tests of one project (Vitest)
npm run e2e                              # Playwright (npx nx e2e web-e2e)
npm run storybook                        # component showcase (npx nx storybook ui)
npm run build                            # web + api production builds
npx nx graph                             # project graph
```

## Non-negotiables

- **Never commit to `main` or `stage`.** `main` is production, `stage` is the integration branch (PROJECT.md 9.3, ADR 0035). One branch per issue from fresh `stage`: `feat/<issue>-short-name`, `fix/…`, `chore/…`, `docs/…`, `ci/…`. Conventional Commits. PR into `stage` (squash) with `Refs #N`; the release PR `stage → main` at the end of a stage closes the issues. The author reviews and merges; you never merge.
- **Secrets:** never read, print or create `.env*` files (except `.env.example` with names only). Secrets live in Vercel / GitHub settings, entered by the author.
- **Security (5.8) is part of done:** user data filtered by `userId` from the session, DTO validation, no `innerHTML` / `bypassSecurityTrust*`, no `$queryRawUnsafe`, SSRF guard on any outbound fetch.
- **TypeScript (PROJECT.md 5.0):** strictly typed, **no `any`** (explicit or `as any`) — use `unknown` + narrowing or generics; no `@ts-ignore` / `@ts-nocheck` (`@ts-expect-error` only in tests, with a reason). **One interface / type / enum / array-of-objects constant per file**, named `<kebab-name>.interface.ts` / `.type.ts` / `.const.ts`, in a `models/` folder next to its users (shared web↔api types in `libs/shared/contracts/src/<domain>/`). No dump files (`types.ts`, `models.ts`, `constants.ts`); `index.ts` only re-exports. **No TS `enum`**: fixed value sets are an `as const` object (`THEME.Dark`) plus a derived union type; code uses the constant, never a repeated string literal (ADR 0024).
- **UI:** features use only `libs/ui` components; styles only through tokens; sizes in `rem` (px only for border widths, outline, outline-offset, box-shadow, the 2px progress bar); breakpoints in `em`; light and dark theme; phone from 360px.
- **Tests:** coverage ≥ 80% for `apps/api` and `libs/ui`; data-isolation tests for every user-owned resource.
- Small commits after every finished step, push the branch — unfinished work must survive a session break.

## Task flow (PROJECT.md 8.2)

Issue on the board (Todo) → `project-manager` moves it to In progress → `architect` writes a short plan (larger tasks) → dev agent implements on its branch → `test-engineer` adds tests → `code-reviewer` + `security-reviewer` review the diff, findings go back to the dev agent → tech lead opens the PR into `stage`, `project-manager` moves to In review → author merges into `stage` → To release → the release PR `stage → main` closes the issue → Done.

The tech lead (main session) is the only one who dispatches agents; subagents cannot call each other. On Claude Max run at most 4 agents in parallel, each in its own git worktree; avoid parallel edits of shared files (`libs/*/src/index.ts`, `CLAUDE.md`, Storybook `preview.ts`, `package.json`). A blocked agent finishes what it can and reports what blocks it.

**Session end or pause:** update the **Status** section of `docs/PROJECT.md` and leave a comment on the current issue: _Done / Left / Next step_. A new session starts from the board, issues In progress and their last comment.

## Agents

`.claude/agents/`: `project-manager`, `architect`, `frontend-dev`, `ui-dev`, `backend-dev`, `test-engineer`, `code-reviewer`, `security-reviewer`.
Skills in `.claude/skills/`: `angular-v22-rules`, `create-ui-component`, `create-api-module`, `security-checklist`, `github-workflow`.

## Hooks and MCP

- `PreToolUse` → `.claude/hooks/guard.mjs` (blocks secrets, commits and pushes to `main` / `stage`, `--no-verify`, destructive commands).
- `PostToolUse` on Edit / Write / MultiEdit → `.claude/hooks/format-on-edit.mjs`: Prettier + `eslint --fix` on the edited file (repo root = git top level of the file, so worktrees work; skipped if that checkout has no `node_modules`); leftover lint errors come back as context. Never blocks.
- `Stop` / `SubagentStop` → `.claude/hooks/stop-checks.mjs`: `nx affected -t typecheck test` for uncommitted changes (incl. untracked and deleted files) under `apps/` and `libs/`; a failure blocks the stop once per cycle (`stop_hook_active`) so the work continues. Instant when nothing changed; timeouts are not treated as failures; read-only agents (reviewers, architect, project-manager) are skipped. Committed work is checked by CI.
- `.mcp.json` (pinned, pre-enabled via `enabledMcpjsonServers`): Angular CLI MCP (`@angular/cli mcp`), Nx MCP (`nx-mcp`), Playwright MCP (`@playwright/mcp`). Check with `/mcp`.
