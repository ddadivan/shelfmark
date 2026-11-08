# Shelfmark — manual setup guide

One-time steps that only the author does (PROJECT.md 9.2). Agents never see, enter or print secret values (CLAUDE.md, PROJECT.md 5.8, 8.5). This guide lists **variable names only**; values go straight from the provider console into Vercel / GitHub settings.

Conventions:

- `<prod-domain>` is the production host, e.g. `<project>.vercel.app` (see section 5.5 for the name).
- "Confirm in stage 2" means the exact value depends on code that does not exist yet (Prisma, Better Auth). Do the step, then re-check it when that code lands.
- Where a variable name is not decided yet, the guide says "name decided in stage 2" instead of guessing. The stage 2 issues will add the final names to `.env.example`.

## 1. Local machine

- [ ] **Node 26** via nvm: `nvm install` then `nvm use` in the repo root (reads `.nvmrc` = `26`). `.npmrc` has `engine-strict=true`, so `npm ci` fails on any other major (ADR 0002).
- [ ] **gitleaks >= 8.25**: `brew install gitleaks`, check with `gitleaks version`. The lefthook pre-commit hook **fails closed**: without gitleaks every commit is rejected (ADR 0003).
- [ ] **Dependencies**: `npm ci`. The `prepare` script runs `lefthook install`; if it prints a warning, run `npx lefthook install`. Dependency install scripts are denied by default through `allowScripts` in `package.json` (ADR 0020), so `npm ci` prints no install-scripts warning (npm 11.20.0, the `packageManager` pin; CI fails on an unreviewed script); if one appears, a new package brought a script: run `npm install-scripts ls`, do not approve it without a reason (ADR 0020).
- [ ] **Playwright browser**: `npx playwright install chromium` (only Chromium in stage 0, ADR 0008).
- [ ] **Run**:

| What | Command | URL |
| --- | --- | --- |
| Web | `npx nx serve web` | http://localhost:4200 (proxies `/api` to port 3000) |
| API | `npx nx serve api` | http://localhost:3000/api, Swagger at `/api/docs` |
| E2E | `npx nx e2e web-e2e` | starts or reuses the web server on 4200 |

Port notes: keep the API on **3000** (`PORT`); the web dev proxy targets it. If 4200 is busy, run e2e with `E2E_PORT=4210 npx nx e2e web-e2e`. `nx serve api` sets `NODE_ENV=development` for you.

The local database is PGlite (embedded PostgreSQL, ADR 0025): no Docker and nothing to install; `npx nx serve api` starts it. The first `prisma` command downloads its schema engine, so it needs network access. Local secrets (Better Auth, OAuth clients) are exported in the shell that starts the API, or injected by a password-manager CLI (section 4.3); the API never reads `.env` files and `.env*` stays git-ignored.

## 2. GitHub

**Verify** (already done in stage 0) at github.com/ddadivan/shelfmark → Settings:

- [ ] Advanced Security (Code security): **Secret scanning** on, **Push protection** on, **Dependabot alerts** and **security updates** on.
- [ ] General → Pull Requests: **Allow squash merging** only (merge commits and rebase merging off).
- [ ] Projects: the board exists with the statuses from PROJECT.md 8.2.
- [ ] Your local `gh` is logged in with the `project` scope: `gh auth status`.

**Later, by issue:**

- Branch protection / ruleset on `main` (PR required, required checks, no force-push, linear history, 0 approvals) — configured in **the CI task**; reference only here.
- CodeQL default setup — **the CI task** (Settings → Advanced Security → Code scanning → CodeQL analysis → Default).
- **Actions secrets and variables** (Settings → Secrets and variables → Actions). None are needed for the CI task: it uses the built-in `GITHUB_TOKEN`, and Vercel deploys through its Git integration, so no Vercel token is stored in GitHub. Possible later entries:
  - a direct (unpooled) Neon connection string for production, **only if** Prisma migrations run in GitHub Actions — name and location decided in stage 2. If so, store it as an **Environment secret** of a `production` environment (Settings → Environments), not a repository secret.
  - Sentry auth token for source maps — name decided in stage 7.

## 3. Neon (database)

The database is used from **stage 2**; stage 0 only creates the project (PROJECT.md 9.1, ADR 0011).

- [ ] Create an account at neon.com (sign in with GitHub is fine). Free plan.
- [ ] **Create the project yourself in the Neon console**, not through an agent: the console, `neonctl projects create` and `neonctl connection-string` show the connection string with the password, and agents must never see it.
  - Name: `shelfmark`. Postgres: latest offered version.
  - **Region**: Vercel Function region `fra1` (Frankfurt, pinned in `vercel.json`, section 5.2) → Neon **AWS Europe (Frankfurt) `eu-central-1`**. Both must match; a cross-ocean hop adds latency to every query. (Vercel's default `iad1` would pair with AWS US East.)
  - The default (production) branch is named **`production`**, not `main`.
  - **Skip the onboarding prompts** such as "paste this prompt into your agent" (and `neon init` / `neonctl init`): they pull connection strings into local env files that agents could read.
- [ ] The CLI is **optional**. Neon now ships a new `neon` CLI next to `neonctl` (`npm i -g neonctl`, then `neonctl auth`). Use it yourself for non-secret work such as `neon branches list`. Agents never use it for anything that touches secrets; the guard hook blocks `connection-string` / `cs`, `projects create`, `branches create`, `roles`, `init`, `env`, `pull` and secret-revealing flags such as `--psql` (PROJECT.md 9.2, ADR 0019).

**Branching strategy** (ADR 0011, PROJECT.md 5.7):

| Environment | Neon branch | Who creates it |
| --- | --- | --- |
| production | `production` (the default branch) | created with the project |
| preview (one per PR) | child branch of `production`, created per preview deployment | Neon ↔ Vercel integration (section 5.4) |
| local | none — PGlite (embedded, no Docker) | stage 2 |

Preview branches are copies of `production` at creation time; once production has real users, previews would contain their data. Decide in stage 2 whether previews branch from `production` or from a seeded, data-free branch. Free-plan branch count is limited: enable automatic deletion of preview branches in the integration settings.

**Connection strings** (two per branch, both secrets):

- **pooled** (host contains `-pooler`) — used by the app at runtime; required for serverless functions, which open many short connections;
- **direct / unpooled** — used only by Prisma Migrate (`prisma migrate deploy`), which needs a session that the pooler does not provide.

Variable names that the app reads are decided in stage 2. The Neon ↔ Vercel integration injects its own variables (currently `DATABASE_URL` = pooled, `DATABASE_URL_UNPOOLED` = direct, plus `PG*` parts) into each Vercel environment; check Vercel → Settings → Environment Variables after connecting. Where they go:

| String | Production | Preview | Development | GitHub Actions |
| --- | --- | --- | --- | --- |
| pooled | Vercel, set by the integration (branch `production`) | Vercel, set per deployment by the integration | not used (local PGlite) | not needed |
| direct | Vercel, used by the build for migrations (`DATABASE_URL_UNPOOLED`) | same, for the preview branch | not used | not needed (CI uses a Postgres service) |

`prisma migrate deploy` runs in the Vercel build (`nx run api:migrate-deploy`, only when `VERCEL=1`, ADR 0025), so each deployment migrates its own Neon branch. It reads `DATABASE_URL_UNPOOLED`: enable that variable for the Production and Preview environments (and for the build, not only runtime). The Preview value of `DATABASE_URL_UNPOOLED` must come from the Neon integration, per preview branch; never set a shared or production value for Preview (the migration script only checks `VERCEL_ENV`, it cannot tell which database a URL points to). Production migrates only for builds of `main`. CI needs no Neon secret: it checks migrations against a `postgres:17-alpine` service.

## 4. OAuth apps

Better Auth serves its routes under `/api/auth/*` (ADR 0012, ADR 0030). The provider callback is `/api/auth/callback/<provider>`, built from `BETTER_AUTH_URL` (confirmed in issue #64).

Create **separate OAuth clients for local and production**, so the production secret never sits on your laptop. GitHub OAuth apps allow only one callback URL each, so this is required there anyway.

Callback URLs:

| Environment | Google | GitHub |
| --- | --- | --- |
| local | `http://localhost:4200/api/auth/callback/google` | `http://localhost:4200/api/auth/callback/github` |
| production | `https://<prod-domain>/api/auth/callback/google` | `https://<prod-domain>/api/auth/callback/github` |
| preview | see the open question below | see the open question below |

Local uses port **4200**, not 3000: the browser talks to the web dev server, which proxies `/api` to the API.

**Previews (ADR 0026).** Every preview has a new URL and Google rejects wildcard redirect URIs, so previews run without OAuth (demo sign-in only) and you create no preview clients. A preview needs only its own `BETTER_AUTH_SECRET`: with `VERCEL_ENV=preview` and no `BETTER_AUTH_URL`, the API uses `https://$VERCEL_BRANCH_URL` (then `https://$VERCEL_URL`) as the base URL and trusts both hostnames (section 5.3).

### 4.1 Google (console.cloud.google.com)

- [ ] Project picker → **New project** → `shelfmark`.
- [ ] **Google Auth Platform** (formerly "APIs & Services → OAuth consent screen") → **Get started**:
  - App information: name `Shelfmark`, user support email = your address.
  - Audience: **External**.
  - Contact information: your address. Accept the policy → Create.
- [ ] **Data access** → Add scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` only (non-sensitive, no verification needed).
- [ ] **Branding**: app home page `https://<prod-domain>`, authorized domain = the production domain. The **privacy policy URL** is required before publishing (page comes in stage 7, PROJECT.md 5.8). Skip the logo for now; uploading one triggers brand verification.
- [ ] **Audience**: stay in **Testing** and add your own Google accounts as test users. **Publish app** in stage 7, after the privacy policy page exists.
- [ ] **Clients** → **Create client** → Application type **Web application**:
  - `Shelfmark local`: Authorized redirect URIs = the local Google URL above.
  - `Shelfmark production`: Authorized redirect URIs = the production Google URL above.
  - Authorized JavaScript origins: not needed (the server does the redirect).
- [ ] Copy each **Client ID** and **Client secret** (the secret is shown in full only at creation — download the JSON if offered, store it in your password manager, then delete the file). Names: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Production values go into Vercel → Production (section 5.3); the local pair is exported in your shell (see "Run locally" below).

### 4.2 GitHub (github.com)

- [ ] Profile photo → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App** (an OAuth App, not a GitHub App).
  - `Shelfmark (local)`: Homepage URL `http://localhost:4200`, Authorization callback URL = the local GitHub URL above.
  - `Shelfmark (production)`: Homepage URL `https://<prod-domain>`, callback = the production GitHub URL above.
  - Leave **Enable Device Flow** off.
- [ ] In each app: copy the **Client ID**, click **Generate a new client secret**, copy it once (shown only now) into your password manager. Names: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Production values go into Vercel → Production; the local pair is exported in your shell.

### 4.3 Better Auth secret

Better Auth also needs a random signing secret and the public base URL per environment. Generate the secret yourself (e.g. `openssl rand -base64 32`, at least 32 characters), one value **per environment**, never reused.

| Name | Local | Production | Preview |
| --- | --- | --- | --- |
| `BETTER_AUTH_SECRET` | required, own value | required, own value | required, own value |
| `BETTER_AUTH_URL` | optional (defaults to `http://localhost:4200`) | `https://<prod-domain>` (required, https, origin only) | not needed: derived from `VERCEL_BRANCH_URL` / `VERCEL_URL`; an explicit value wins |
| `BETTER_AUTH_TRUSTED_ORIGINS` | optional | optional | optional |

`BETTER_AUTH_URL` is an origin only (no path, no trailing slash). Production has no fallback to Vercel's URL variables: the API refuses to boot in production without it. Only on Vercel previews (`VERCEL_ENV=preview`) an unset value falls back to `https://$VERCEL_BRANCH_URL`, then `https://$VERCEL_URL` (hostnames are validated as https origins; both are added to the trusted origins). `BETTER_AUTH_TRUSTED_ORIGINS` is a comma-separated list of extra exact origins (no wildcards); the base URL is always trusted.

**Run locally.** Never put these in a `.env` file. Export them in the shell that starts the API, or inject them with a password-manager CLI, before `npx nx serve api` (`local-db.mjs` passes `process.env` through):

```bash
export BETTER_AUTH_SECRET=…        # your local secret
export GITHUB_CLIENT_ID=… GITHUB_CLIENT_SECRET=…
export GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=…
npx nx serve api    # http://localhost:3000, behind the web dev proxy on :4200
npx nx serve web    # sign in at http://localhost:4200
```

Locally and on previews a provider whose pair is missing is simply disabled (the API logs which variable names to set). In production (not previews) both providers are required and a missing pair stops the boot (ADR 0026); half a pair stops the boot everywhere. `BETTER_AUTH_SECRET` is required in every environment.

## 5. Vercel

### 5.1 Account and CLI

- [ ] Sign up at vercel.com, **Hobby** plan (non-commercial only, ADR 0013). An account created by **email** must connect GitHub first: Account → **Authentication** → connect GitHub; only then can you import the repository.
- [ ] The CLI is **optional** (`npm i -g vercel`, `vercel login`). Never run `vercel env pull` or `vercel pull`: they write secrets into local files that agents could read. Agents never use the Vercel CLI for anything secret; linking and env variables are done by you in the dashboard, and agents verify deployments through GitHub deployment statuses (`gh pr checks`). The guard hook blocks `vercel env *`, `pull`, `dev` and `api` (PROJECT.md 9.2, ADR 0019).

### 5.2 Import the repository (the project link itself is done in the deploy task)

- [ ] vercel.com/new → **Import Git Repository** → install the Vercel GitHub app for `ddadivan/shelfmark` only (not all repositories) → Import.
- [ ] Root Directory: `./` (repo root; Nx builds from there). Framework preset, build command, output directory (`dist/apps/web/browser` for the web), the API as one Vercel Function, region and the `/api/*` rewrite are set in `vercel.json` (ADR 0019); the first import deployment fails until that file is merged, which is expected.
- [ ] Settings → **Build and Deployment** → Node.js Version: **26.x** (ADR 0002).
- [ ] Function Region is **`fra1`** (Frankfurt), pinned in `vercel.json`; it matches Neon `eu-central-1`. Do not change it without moving the database.

### 5.3 Environment variables

Settings → **Environment Variables**. Each variable is set per environment: **Production** (`main`), **Preview** (every other branch / PR), **Development** (only for `vercel dev`, which we do not use).

| Name | Production | Preview | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` | `production` | Required for helmet HSTS and `upgrade-insecure-requests` (ADR 0007). Unset also means production, but set it explicitly. Vercel may already set it; verify. |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | integration | integration | Injected by Neon (section 3) |
| `BETTER_AUTH_SECRET` | own value | own value (a different one) | Required: without it the API does not boot (health and docs included) |
| `BETTER_AUTH_URL` | `https://<prod-domain>` | leave unset | Required in production; on previews derived from the Vercel branch URL (ADR 0026 update) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | production client | not set until ADR 0026 is decided | Both or neither; mark Sensitive |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | production app | not set until ADR 0026 is decided | Both or neither; mark Sensitive |
| Sentry DSN | | | Stage 7 |

Mark every secret as **Sensitive** (value cannot be read back in the dashboard). Do not set `PORT` on Vercel. An env change applies only to **new** deployments: redeploy after editing.

### 5.4 Neon ↔ Vercel integration and previews

- [ ] Vercel → **Integrations** / Marketplace → **Neon** → choose **Link Existing Neon Account** (the "Neon Postgres Previews Integration", not the Vercel-native flavour) and link the `shelfmark` project to the Vercel project. Limit its access to the `shelfmark-app` project only.
  - Production → Neon branch `production`.
  - Preview → **create a database branch for each preview deployment**; enable automatic cleanup of obsolete branches.
  - Development → off (no development branch).
- [ ] Preview deployments are on by default for every PR (Settings → Git). Keep **Vercel Authentication** (Deployment Protection) on for previews: only you can open them. Disable the **Vercel Toolbar** on previews (Settings → General → Vercel Toolbar): it injects scripts that the CSP blocks. Dependabot branches get no preview deployment (`vercel.json`, ADR 0019).

### 5.5 Domain

- [x] Production domain: **`shelfmark-app.vercel.app`** (`shelfmark.vercel.app` is taken by another project). This is `<prod-domain>` in sections 4 and 5.3; update the OAuth clients if it ever changes.

### 5.6 Deployment configuration (done in the deploy task)

All of it lives in `vercel.json`, `api/index.mjs` and `apps/api/src/vercel-handler.ts`; the reasoning is in [ADR 0019](adr/0019-vercel-deployment-architecture.md). Nothing to do by hand except the checks below.

- **CSP and security headers** for the web are set in `vercel.json` and the middleware (ADR 0022), tested by an e2e check for CSP violations. Static CSP (files, set in `vercel.json`): `default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'`. `/api/*` gets no CSP from `vercel.json`: helmet sets it there.
- **Nonce:** component styles (`libs/ui`, CDK overlays) are added at runtime, so HTML documents get a per-request nonce from the Vercel Routing Middleware `middleware.ts` (`ngCspNonce` in `index.html`, `Cache-Control: private, no-store`); `'unsafe-inline'` stays out. Document CSP template (`{nonce}` is a fresh 128-bit base64 value): `default-src 'self'; script-src 'self'; style-src 'self' 'nonce-{nonce}'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'`. The middleware code is in `libs/web/csp`; `nx run web:middleware-shell` (part of `buildCommand`) bundles the built `index.html` into it. On the first preview deployment check: `curl` of `/` shows one CSP whose nonce equals `ngCspNonce` in the body, two requests differ, the security headers are present, a hashed asset gets the static CSP, `/missing.js` is 404.
- **Swagger UI assets** for `/api/docs` come from `swagger-ui-dist` and are included in the function with `includeFiles`; verify `/api/docs` on the first preview deployment.
- **ESM output** of the API is `.mjs` (`main.mjs`, `vercel-handler.mjs`).
- After the first deployment check `NODE_ENV=production` and `/api/health` returning 200 on production and preview.

### 5.7 Storybook project (`shelfmark-ui`)

A second Vercel project from the same repository publishes the component showcase; the reasoning (including the relaxed CSP) is in [ADR 0023](adr/0023-storybook-showcase-hosting.md). Its configuration is `libs/ui/vercel.json`; the settings below are done by the author in the dashboard.

- [x] Project **`shelfmark-ui`** (team `reacts-projects-581acec8`, Hobby), same GitHub repository.
- [x] **Root Directory** `libs/ui`, with "Include files outside the Root Directory in the Build Step" enabled (the install and build commands run from the workspace root) and "Skip deployments when there are no changes to the root directory or its dependencies" enabled.
- [x] Framework Preset **Other**, Node.js **26.x**, no environment variables.
- [x] **Vercel Authentication** on previews, Vercel Toolbar off.
- Install `cd ../.. && npm ci --include=dev`, build `cd ../.. && npx nx build-storybook ui --output-style=static`, output `storybook-static` (all from `libs/ui/vercel.json`; a project whose Root Directory is `libs/ui` ignores the repository-root `vercel.json` and `middleware.ts` of `shelfmark-app`).
- Production URL: `https://shelfmark-ui.vercel.app` (if the name is taken, note the real one here).
- On the first preview check: the manager and a story load, the response has one `Content-Security-Policy` header (the relaxed one from ADR 0023) and the other security headers, the browser console shows no CSP violation.

## 6. Secrets policy

| Secret | Lives in | Never in |
| --- | --- | --- |
| Neon connection strings | Vercel env (via integration); GitHub Environment secret only if CI migrates | repo, chat, issues, logs |
| OAuth client secrets, Better Auth secret | Vercel env (Production / Preview); local ones only on your machine | repo, chat, issues, logs |
| Local development values | exported in your shell or injected by a password-manager CLI (section 4.3), never a file in the repository | anywhere shared |
| Backup copy | your password manager | notes, screenshots |

Rules:

- The repo contains **names only**, in `.env.example`. `.env*` is git-ignored; agents are blocked from reading it (PROJECT.md 8.5).
- Client IDs are not secret, but treat them like secrets anyway for simplicity.
- Never paste a value into a Claude session, an issue, a PR or a commit message.
- **Rotation**: rotate on any suspicion, when someone loses access, and at least yearly. Order: create the new value at the provider → update Vercel (and GitHub, if used) → redeploy → revoke the old value. Rotating the Better Auth secret signs everybody out. Neon: Branches → `production` → Roles → reset password, then make sure the integration-managed variables in Vercel picked up the new value.

**If a secret leaks** (committed, pasted, shown in a log or screenshot):

1. **Rotate it immediately** at the provider (section above). The repo is public: assume the value is already copied. Deleting the commit is not enough.
2. Update Vercel / GitHub and redeploy.
3. Check provider logs (Neon, Google, GitHub) for unknown use.
4. Then clean up: close the GitHub secret scanning alert as "revoked"; rewrite history only if the author decides it is worth it.

Prevention layers: gitleaks in the pre-commit hook (locally) and in CI (CI task); GitHub push protection rejects a push with a known secret pattern — **never use the bypass**; `--no-verify` is blocked for agents.

## 7. Checklist

| # | Step | Where | Owner | Needed by |
| --- | --- | --- | --- | --- |
| 1 | Node 26, gitleaks, `npm ci`, Playwright Chromium | local machine | author | now |
| 2 | Verify secret scanning, push protection, Dependabot, squash-only | GitHub settings | author | CI task |
| 3 | `gh auth status` with `project` scope | local machine | author | now |
| 4 | Branch protection on `main`, CodeQL | GitHub settings | author / CI task | CI task |
| 5 | Neon account, project in `eu-central-1` (CLI optional) | neon.com | author | deploy task |
| 6 | Vercel account (Hobby, GitHub connected), GitHub app on this repo only (CLI optional) | vercel.com | author | deploy task |
| 7 | Production domain chosen | Vercel → Domains | author | deploy task |
| 8 | Import repo, Node 26.x, function region `fra1` (in `vercel.json`) | Vercel project settings | author / deploy task | deploy task |
| 9 | Neon ↔ Vercel integration ("Link Existing Neon Account", prod `production`, branch per preview, cleanup) | Vercel Integrations | author | deploy task |
| 10 | `NODE_ENV=production` for Production and Preview | Vercel env | author | deploy task |
| 11 | Google project, consent screen, local + production clients | Google Cloud console | author | stage 2 |
| 12 | GitHub OAuth apps, local + production | GitHub Developer settings | author | stage 2 |
| 13 | Better Auth secret per environment; OAuth + DB variables in Vercel | Vercel env | author | stage 2 |
| 14 | ~~Docker Desktop for local PostgreSQL~~ not needed (PGlite, ADR 0025) | local machine | - | dropped |
| 15 | ~~Migration secret in a GitHub `production` environment~~ not needed (Vercel build migrates, ADR 0025) | GitHub Environments | - | dropped |
| 16 | Privacy policy URL, publish the Google app | Google Auth Platform | author | stage 7 |

The showcase builds only from `main`: `ignoreCommand` in `libs/ui/vercel.json` skips every other branch (issue #50), so PRs create no `shelfmark-ui` deployments and the Hobby deployment limit is spent on the app project. Storybook on PRs is checked by CI (`nx test-storybook ui`).
