# Shelfmark — manual setup guide

One-time steps that only the author does (PROJECT.md 9.2). Agents never see, enter or print secret values (CLAUDE.md, PROJECT.md 5.8, 8.5). This guide lists **variable names only**; values go straight from the provider console into Vercel / GitHub settings.

Conventions:

- `<prod-domain>` is the production host, e.g. `<project>.vercel.app` (see section 5.5 for the name).
- "Confirm in stage 2" means the exact value depends on code that does not exist yet (Prisma, Better Auth). Do the step, then re-check it when that code lands.
- Where a variable name is not decided yet, the guide says "name decided in stage 2" instead of guessing. The stage 2 issues will add the final names to `.env.example`.

## 1. Local machine

- [ ] **Node 26** via nvm: `nvm install` then `nvm use` in the repo root (reads `.nvmrc` = `26`). `.npmrc` has `engine-strict=true`, so `npm ci` fails on any other major (ADR 0002).
- [ ] **gitleaks >= 8.25**: `brew install gitleaks`, check with `gitleaks version`. The lefthook pre-commit hook **fails closed**: without gitleaks every commit is rejected (ADR 0003).
- [ ] **Dependencies**: `npm ci`. The `prepare` script runs `lefthook install`; if it prints a warning, run `npx lefthook install`. npm may also warn that some dependency install scripts are "not covered by allowScripts"; this is a known npm 11 notice, not an error.
- [ ] **Playwright browser**: `npx playwright install chromium` (only Chromium in stage 0, ADR 0008).
- [ ] **Run**:

| What | Command | URL |
| --- | --- | --- |
| Web | `npx nx serve web` | http://localhost:4200 (proxies `/api` to port 3000) |
| API | `npx nx serve api` | http://localhost:3000/api, Swagger at `/api/docs` |
| E2E | `npx nx e2e web-e2e` | starts or reuses the web server on 4200 |

Port notes: keep the API on **3000** (`PORT`); the web dev proxy targets it. If 4200 is busy, run e2e with `E2E_PORT=4210 npx nx e2e web-e2e`. `nx serve api` sets `NODE_ENV=development` for you.

Stage 2 adds a local PostgreSQL in Docker (`docker-compose.yml`), so install Docker Desktop (or OrbStack) before stage 2. How local secrets are loaded (the API never reads `.env` files today) is decided in stage 2; `.env*` stays git-ignored either way.

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
- [ ] **Create the project yourself in the Neon console**, not through an agent: the console and `neonctl projects create` show the connection string with the password, and agents must never see it.
  - Name: `shelfmark`. Postgres: latest offered version.
  - **Region**: the AWS region closest to the Vercel Function region (section 5.2). Vercel's default is `iad1` (Washington, D.C.) → Neon **AWS US East (N. Virginia)**. If you pick a European Vercel region (e.g. `fra1`), pick **AWS Europe (Frankfurt)** instead. Both must match; a cross-ocean hop adds latency to every query.
- [ ] Install and log in to the CLI so agents can manage branches later: `npm i -g neonctl` then `neonctl auth` (PROJECT.md 9.2).

**Branching strategy** (ADR 0011, PROJECT.md 5.7):

| Environment | Neon branch | Who creates it |
| --- | --- | --- |
| production | `main` (the default branch) | created with the project |
| preview (one per PR) | child branch of `main`, created per preview deployment | Neon ↔ Vercel integration (section 5.4) |
| local | none — PostgreSQL in Docker | stage 2 |

Preview branches are copies of `main` at creation time; once production has real users, previews would contain their data. Decide in stage 2 whether previews branch from `main` or from a seeded, data-free branch. Free-plan branch count is limited: enable automatic deletion of preview branches in the integration settings.

**Connection strings** (two per branch, both secrets):

- **pooled** (host contains `-pooler`) — used by the app at runtime; required for serverless functions, which open many short connections;
- **direct / unpooled** — used only by Prisma Migrate (`prisma migrate deploy`), which needs a session that the pooler does not provide.

Variable names that the app reads are decided in stage 2. The Neon ↔ Vercel integration injects its own variables (currently `DATABASE_URL` = pooled, `DATABASE_URL_UNPOOLED` = direct, plus `PG*` parts) into each Vercel environment; check Vercel → Settings → Environment Variables after connecting. Where they go:

| String | Production | Preview | Development | GitHub Actions |
| --- | --- | --- | --- | --- |
| pooled | Vercel, set by the integration (branch `main`) | Vercel, set per deployment by the integration | not used (local Docker) | not needed |
| direct | Vercel, only if migrations run in the Vercel build | same, for the preview branch | not used | only if migrations run in CI (section 2) |

Where `prisma migrate deploy` runs on merge to `main` (PROJECT.md 9.5) is decided in stage 2.

## 4. OAuth apps

Better Auth serves its routes under `/api/auth/*` (ADR 0012). Its convention for the provider callback is `/api/auth/callback/<provider>`. **Confirm the exact paths when Better Auth is wired in stage 2.**

Create **separate OAuth clients for local and production**, so the production secret never sits on your laptop. GitHub OAuth apps allow only one callback URL each, so this is required there anyway.

Callback URLs (confirm in stage 2):

| Environment | Google | GitHub |
| --- | --- | --- |
| local | `http://localhost:4200/api/auth/callback/google` | `http://localhost:4200/api/auth/callback/github` |
| production | `https://<prod-domain>/api/auth/callback/google` | `https://<prod-domain>/api/auth/callback/github` |
| preview | see the open question below | see the open question below |

Local uses port **4200**, not 3000: the browser talks to the web dev server, which proxies `/api` to the API.

**Open question for stage 2 (previews).** Every preview has a new URL. Google rejects wildcard redirect URIs and a GitHub app has one callback URL, so OAuth on previews needs one of: Better Auth's OAuth proxy plugin (callback through production), a stable preview alias with its own clients, or no OAuth on previews (demo sign-in only). Decide in stage 2; until then do not create preview clients.

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
- [ ] Copy each **Client ID** and **Client secret** (the secret is shown in full only at creation — download the JSON if offered, store it in your password manager, then delete the file). Production values go into Vercel → Production (section 5.3). Names: decided in stage 2.

### 4.2 GitHub (github.com)

- [ ] Profile photo → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App** (an OAuth App, not a GitHub App).
  - `Shelfmark (local)`: Homepage URL `http://localhost:4200`, Authorization callback URL = the local GitHub URL above.
  - `Shelfmark (production)`: Homepage URL `https://<prod-domain>`, callback = the production GitHub URL above.
  - Leave **Enable Device Flow** off.
- [ ] In each app: copy the **Client ID**, click **Generate a new client secret**, copy it once (shown only now) into your password manager. Production values go into Vercel → Production. Names: decided in stage 2.

### 4.3 Better Auth secret

Better Auth also needs a random signing secret and the public base URL per environment. Generate the secret yourself (e.g. `openssl rand -base64 32`), one value **per environment**, never reused. Names decided in stage 2.

## 5. Vercel

### 5.1 Account and CLI

- [ ] Sign up at vercel.com with GitHub, **Hobby** plan (non-commercial only, ADR 0013).
- [ ] `npm i -g vercel` then `vercel login` (PROJECT.md 9.2). Never run `vercel env pull`: it writes secrets into a local `.env` file that agents could read.

### 5.2 Import the repository (the project link itself is done in the deploy task)

- [ ] vercel.com/new → **Import Git Repository** → install the Vercel GitHub app for `ddadivan/shelfmark` only (not all repositories) → Import.
- [ ] Root Directory: `./` (repo root; Nx builds from there). Framework preset, build command, output directory (`dist/apps/web/browser` for the web), the API as one Vercel Function, and the `/api/*` rewrite are **finalised in the deploy task** in `vercel.json` — accept the defaults now or let the deploy task do the import.
- [ ] Settings → **Build and Deployment** → Node.js Version: **26.x** (ADR 0002).
- [ ] Settings → **Functions** → Function Region: choose it together with the Neon region (section 3) and do not change it later without moving the database.

### 5.3 Environment variables

Settings → **Environment Variables**. Each variable is set per environment: **Production** (`main`), **Preview** (every other branch / PR), **Development** (only for `vercel dev`, which we do not use).

| Name | Production | Preview | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` | `production` | Required for helmet HSTS and `upgrade-insecure-requests` (ADR 0007). Unset also means production, but set it explicitly. Vercel may already set it; verify. |
| database URLs | integration | integration | Injected by Neon (section 3); names the app reads decided in stage 2 |
| Better Auth secret, base URL | own value | own value | Stage 2; production base URL `https://<prod-domain>` |
| Google client ID / secret | production client | stage 2 decision | Stage 2 |
| GitHub client ID / secret | production app | stage 2 decision | Stage 2 |
| Sentry DSN | | | Stage 7 |

Mark every secret as **Sensitive** (value cannot be read back in the dashboard). Do not set `PORT` on Vercel. An env change applies only to **new** deployments: redeploy after editing.

### 5.4 Neon ↔ Vercel integration and previews

- [ ] Vercel → **Integrations** / Marketplace → **Neon** → connect your existing Neon account and the `shelfmark` project to the Vercel project (if offered a choice, link the existing project rather than letting Vercel create a new one; the exact flavour is confirmed in the deploy task).
  - Production → Neon branch `main`.
  - Preview → **create a database branch for each preview deployment**; enable automatic cleanup of obsolete branches.
  - Development → off.
- [ ] Preview deployments are on by default for every PR (Settings → Git). Keep **Vercel Authentication** (Deployment Protection) on for previews: only you can open them.

### 5.5 Domain

- [ ] `shelfmark.vercel.app` is **already taken** by another project (checked Nov 5, 2026), and the npm name `shelfmark` is free. Pick the production name in Vercel → Settings → **Domains** (e.g. `shelfmark-app.vercel.app` or a custom domain; `shelfmark.app`, `.dev`, `.io` are registered by others). The chosen host is `<prod-domain>` in sections 4 and 5.3; update the OAuth clients if it changes.

### 5.6 What the deploy task will configure (no action now)

- **CSP header** for the web (from the web security review): `default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'`, tested against a production build (use `ngCspNonce`, never `'unsafe-inline'`), plus an e2e check for CSP violations.
- **Swagger UI assets** for `/api/docs` come from `swagger-ui-dist`; verify on the preview deploy and bundle them or serve from a CDN if the page is blank.
- **ESM output** of the API (`main.mjs` or a `{"type":"module"}` package.json in `dist/apps/api`) before wrapping it in a Function.
- `NODE_ENV=production` check, `/api/health` returning 200 on production and preview.

## 6. Secrets policy

| Secret | Lives in | Never in |
| --- | --- | --- |
| Neon connection strings | Vercel env (via integration); GitHub Environment secret only if CI migrates | repo, chat, issues, logs |
| OAuth client secrets, Better Auth secret | Vercel env (Production / Preview); local ones only on your machine | repo, chat, issues, logs |
| Local development values | a git-ignored local file on your machine (format decided in stage 2) | anywhere shared |
| Backup copy | your password manager | notes, screenshots |

Rules:

- The repo contains **names only**, in `.env.example`. `.env*` is git-ignored; agents are blocked from reading it (PROJECT.md 8.5).
- Client IDs are not secret, but treat them like secrets anyway for simplicity.
- Never paste a value into a Claude session, an issue, a PR or a commit message.
- **Rotation**: rotate on any suspicion, when someone loses access, and at least yearly. Order: create the new value at the provider → update Vercel (and GitHub, if used) → redeploy → revoke the old value. Rotating the Better Auth secret signs everybody out. Neon: Branches → `main` → Roles → reset password, then make sure the integration-managed variables in Vercel picked up the new value.

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
| 5 | Neon account, project in the chosen region, `neonctl auth` | neon.com, terminal | author | deploy task |
| 6 | Vercel account (Hobby), `vercel login`, GitHub app on this repo only | vercel.com, terminal | author | deploy task |
| 7 | Production domain chosen | Vercel → Domains | author | deploy task |
| 8 | Import repo, Node 26.x, function region = Neon region | Vercel project settings | author / deploy task | deploy task |
| 9 | Neon ↔ Vercel integration (prod `main`, branch per preview, cleanup) | Vercel Integrations | author | deploy task |
| 10 | `NODE_ENV=production` for Production and Preview | Vercel env | author | deploy task |
| 11 | Google project, consent screen, local + production clients | Google Cloud console | author | stage 2 |
| 12 | GitHub OAuth apps, local + production | GitHub Developer settings | author | stage 2 |
| 13 | Better Auth secret per environment; OAuth + DB variables in Vercel | Vercel env | author | stage 2 |
| 14 | Docker Desktop for local PostgreSQL | local machine | author | stage 2 |
| 15 | Migration secret in a GitHub `production` environment (only if CI migrates) | GitHub Environments | author | stage 2 |
| 16 | Privacy policy URL, publish the Google app | Google Auth Platform | author | stage 7 |
