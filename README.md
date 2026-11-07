# Shelfmark

**Paste a link. Find it again. Even in a year.**

Shelfmark keeps every link you save in one place. Paste a URL, get a preview, organise it with nested folders, tags and favorites, and find it again with search. It is a personal, responsive web app and a public portfolio project. It is built as a full-stack product by one engineer working with a team of eight Claude Code agents, and every change goes through a reviewed pull request.

A _shelfmark_ is the mark that shows a book's place on a library shelf: shelf + mark, a nod to bookmark.

|                               |                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| App                           | [shelfmark-app.vercel.app](https://shelfmark-app.vercel.app)                                |
| Component library (Storybook) | [shelfmark-ui.vercel.app](https://shelfmark-ui.vercel.app)                                  |
| Project document              | [`docs/PROJECT.md`](docs/PROJECT.md) — scope, stories, stack, security, data model, process |
| Design system                 | [`docs/design/`](docs/design/README.md)                                                     |
| Decision log                  | [`docs/adr/`](docs/adr/README.md)                                                           |

> Status: stage 1 is in development. Screenshots and a demo video will be added when the main screens ship.

## Why

People save links wherever they can: Telegram "Saved Messages", browser bookmarks, notes, chats. Then they can't find them, rarely come back to them, and forget why they saved them. Shelfmark is one place for all of them, with folders, tags, notes ("why I saved it") and search. It works with any kind of link: videos, articles, products, courses, tools.

## Stack

TypeScript 6 everywhere, in an [Nx](https://nx.dev) monorepo.

| Layer      | Technology                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Web        | Angular 22: standalone, zoneless, signals, Signal Forms, NgRx SignalStore, Angular Aria / CDK, Transloco |
| UI library | Own component library `libs/ui`: design tokens, light and dark themes, `rem` sizing, Storybook           |
| API        | NestJS under `/api`, OpenAPI docs at `/api/docs`                                                         |
| Data       | PostgreSQL on Neon, Prisma 7; embedded PGlite for local development and tests (no Docker)                |
| Auth       | Better Auth with Google and GitHub; httpOnly, Secure, SameSite cookies on one origin                     |
| Hosting    | Vercel: static web app and the API as one Vercel Function (`fra1`)                                       |
| Quality    | Vitest, Playwright (desktop and phone), axe, ESLint, Prettier, stylelint, CodeQL, gitleaks               |

```
apps/
  web/          Angular app (features in src/app/features/*)
  web-e2e/      Playwright end-to-end tests, desktop + phone
  api/          NestJS REST API
libs/
  ui/           Component library, tokens, Storybook
  shared/
    contracts/  DTOs and types shared by web and api
```

Contracts come first: a change to the API starts in `libs/shared/contracts`, so the web and the API cannot drift apart.

## Security

Security is part of "done" for every task ([PROJECT.md 5.8](docs/PROJECT.md)):

- **SSRF-safe link previews:** http(s) only. Private and reserved IPs are blocked after DNS resolution. Timeouts, response-size and redirect limits apply, and no cookies are forwarded.
- **Data isolation:** every query is filtered by the user id taken from the session, with dedicated "user A cannot see user B's data" tests.
- **Strict headers:** a strict Content-Security-Policy with a per-request nonce, HSTS and Helmet. No CORS, because web and API share one origin.
- **No `innerHTML` and no raw SQL:** `bypassSecurityTrust*` and `$queryRawUnsafe` are forbidden by lint.
- **Supply chain:** exact dependency pins, install scripts denied by default, `npm audit` and gitleaks in CI, Dependabot and CodeQL.
- **Automated review:** a security-reviewer agent checks every pull request against the 5.8 table.

## Built with an agent team

Development runs through [Claude Code](https://claude.com/claude-code) with eight specialised subagents. Their definitions are in [`.claude/agents/`](.claude/agents/):

| Agent               | Role                                          |
| ------------------- | --------------------------------------------- |
| `project-manager`   | Issues, milestones, the GitHub Projects board |
| `architect`         | Plans for larger tasks, contracts, ADRs       |
| `frontend-dev`      | Angular features in `apps/web`                |
| `ui-dev`            | The `libs/ui` component library and Storybook |
| `backend-dev`       | NestJS API, Prisma schema and migrations      |
| `test-engineer`     | Unit, e2e and data-isolation tests            |
| `code-reviewer`     | Correctness, project rules, design compliance |
| `security-reviewer` | Every diff against the security table         |

A task moves from issue to plan to implementation, then tests, then code and security review, then a pull request. The author reviews and merges every pull request; agents never merge. Skills in [`.claude/skills/`](.claude/skills/) hold the project's rules (Angular 22 rules, UI component and API module templates, security checklist, GitHub workflow). Hooks in [`.claude/hooks/`](.claude/hooks/) block secrets and destructive commands, format on edit, and run type checks and tests before an agent stops. The reasoning behind each significant decision is in the [ADR log](docs/adr/README.md).

## Run it locally

Requirements: Node 26 LTS (`nvm use` reads `.nvmrc`) and [gitleaks](https://github.com/gitleaks/gitleaks) 8.25 or newer for the pre-commit hook.

```bash
npm ci
npx nx serve web        # http://localhost:4200
npx nx serve api        # http://localhost:3000/api
```

Tests and checks:

```bash
npx nx affected -t lint typecheck test build   # what CI runs
npx nx test <project> --coverage               # unit tests (Vitest)
npx nx e2e web-e2e                             # Playwright, desktop + phone
npx nx storybook ui                            # component showcase
npm run lint:styles && npm run format:check
```

Production services (Neon, the OAuth apps, Vercel, secrets) are set up once by the author. The steps are in [`docs/SETUP.md`](docs/SETUP.md).

## Contributing

This is a personal portfolio project, so outside pull requests are not expected. Issues and comments are welcome. Repository conventions are in [`CLAUDE.md`](CLAUDE.md): Conventional Commits, one branch per issue, strict TypeScript with no `any`, and UI text only through translation keys.
