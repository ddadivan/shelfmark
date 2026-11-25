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

| What | Command (npm alias) | Same as | URL |
| --- | --- | --- | --- |
| Web | `npm start` | `npx nx serve web` | http://localhost:4200 (proxies `/api` to port 3000) |
| API | `npm run start:api` | `npx nx serve api` | http://localhost:3000/api, Swagger at `/api/docs` |
| Web + API | `npm run start:all` | `npx nx run-many -t serve -p web api` | both of the above |
| E2E | `npm run e2e` | `npx nx e2e web-e2e` | starts or reuses the web server on 4200 |
| Storybook | `npm run storybook` | `npx nx storybook ui` | the URL it prints |

**Mock or real data.** `npm start` alone runs the web app on in-browser mocks: sign-in, links, folders and tags work without the API or any keys, and data lives in `localStorage`. To use the real API locally:

1. Export `BETTER_AUTH_SECRET` in the shell (any random value of 32+ characters, for example `openssl rand -base64 32`; it is required even locally, see 4.3). The OAuth variables are optional locally.
2. `npm run start:all`.
3. In the browser console on http://localhost:4200: `localStorage.setItem('sm-real-auth-api', '1')`, then reload. `localStorage.removeItem('sm-real-auth-api')` goes back to the mocks.
4. Sign in with **Try demo** (no OAuth keys needed), or with Google / GitHub once their local client variables are exported (section 4).

Port notes: keep the API on **3000** (`PORT`); the web dev proxy targets it. If 4200 is busy, run e2e with `E2E_PORT=4210 npx nx e2e web-e2e`. `nx serve api` sets `NODE_ENV=development` for you.

The local database is PGlite (embedded PostgreSQL, ADR 0025): no Docker and nothing to install; `npx nx serve api` starts it. The first `prisma` command downloads its schema engine, so it needs network access. Local secrets (Better Auth, OAuth clients) are exported in the shell that starts the API, or injected by a password-manager CLI (section 4.3); the API never reads `.env` files and `.env*` stays git-ignored.

## 2. GitHub

**Verify** (already done in stage 0) at github.com/ddadivan/shelfmark → Settings:

- [ ] Advanced Security (Code security): **Secret scanning** on, **Push protection** on, **Dependabot alerts** and **security updates** on.
- [ ] General → Pull Requests: **Allow squash merging** and **Allow merge commits** on, rebase merging off (ADR 0035: feature PRs into `stage` are squashed; the release PR `stage → main` and merging `main` back into `stage` after a hotfix use a merge commit).
- [ ] Projects: the board exists with the statuses from PROJECT.md 8.2.
- [ ] Your local `gh` is logged in with the `project` scope: `gh auth status`.

**Later, by issue:**

- Rulesets (configured in **the CI task** and in the release-flow switch, ADR 0035; reference only here):
  - `main`: PR required, the required checks, no force-push or deletion, 0 approvals; merge methods **Merge** and **Squash**, **no** "Require linear history" (the release PR `stage → main` is a merge commit).
  - `stage`: PR required, required checks `lint-test-build`, `e2e`, `npm-audit`, `gitleaks`, no force-push or deletion, 0 approvals; merge methods **Squash** and **Merge** (merge only for `main → stage` after a hotfix), no rebase, no linear history.
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

`prisma migrate deploy` runs in the Vercel build (`nx run api:migrate-deploy`, only when `VERCEL=1`, ADR 0025), so each deployment migrates its own Neon branch. It reads `DATABASE_URL_UNPOOLED`: enable that variable for the Production and Preview environments (and for the build, not only runtime). The Preview value of `DATABASE_URL_UNPOOLED` must come from the Neon integration, per preview branch; never set a shared or production value for Preview (the migration script only checks `VERCEL_ENV`, it cannot tell which database a URL points to). Production migrates only for builds of `main`. CI needs no Neon secret: it checks migrations against a `pgvector/pgvector:0.8.7-pg17` service (Postgres 17 with pgvector, ADR 0052). Neon needs nothing extra: the `ai_embeddings` migration runs `CREATE EXTENSION IF NOT EXISTS vector`, which the Neon database owner may run.

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
| `CRON_SECRET` | own value, at least 32 characters | not set | Mark Sensitive. Vercel sends it as `Authorization: Bearer …` to the daily crons in `vercel.json` (demo cleanup, Trash cleanup and the AI sweep; ADR 0034, 0036, 0049); see 5.8 and 5.11. Cron jobs run on Production deployments only |
| `ADMIN_EMAILS` | your sign-in email(s), comma-separated | optional | Issue #272. Emails (case-insensitive) that may use the admin API and page to read feedback, set its status and reply. Unset or empty means nobody is an admin. Use the email of the Google / GitHub account you sign in with. Redeploy after changing. |
| `SENTRY_DSN`, `SENTRY_WEB_DSN` | DSN of the API / web Sentry project | optional, empty by default | Issue #109, ADR 0032. Create two Sentry projects (Node.js for the API, Browser JavaScript for the web), copy each DSN (a public client key, not a secret). Empty = monitoring off. Vercel supplies `VERCEL_ENV` (environment) and `VERCEL_GIT_COMMIT_SHA` (release) itself. Redeploy after setting. |
| `ANTHROPIC_API_KEY` | the Anthropic API key (5.11) | **never** | Issue #389, ADR 0047 / 0049. **Production only**, mark **Sensitive**; never add it to Preview or Development. Read once at boot (an invalid value stops the boot, the error names the variable only). The real provider is used only when the key is set, `NODE_ENV` is production, `VERCEL_ENV` is not `preview`, `AI_PROVIDER` is not `mock` and the user is not a demo user; everything else (local, CI, previews, demo sandboxes) gets the mock provider. Unset = mock everywhere. |
| `VOYAGE_API_KEY` | already set | not set | Search by meaning and related links (AI-3, ADR 0052). **Production only**, mark **Sensitive**; never add it to Preview or Development. Read once at boot (an invalid value stops the boot, the error names the variable only). Real Voyage embeddings are used only when the key is set, `NODE_ENV` is production, `VERCEL_ENV` is not `preview`, `AI_PROVIDER` is not `mock` and the user is not a demo user; everything else gets the deterministic mock. The code pins `https://api.voyageai.com/v1/embeddings`; there is no base-URL variable. Unset = mock everywhere. |
| `AI_FULL_ACCESS_EMAILS` | your and the second account's sign-in emails, comma-separated | optional | Issue #389, ADR 0047 point 7 (private phase). Same format as `ADMIN_EMAILS` (case-insensitive, normalised the same way): these accounts get Pro and the AI pack (1,000 links a month, 5,000 one-time "Process existing links"); everyone else is Free (50 a month, no backfill). Read per request, never written to the database. Unset or empty = nobody. Redeploy after changing. |
| `AI_PROVIDER` | leave unset | leave unset | Optional. `mock` forces the mock providers (language model and embeddings) even with a key (a production smoke test, a self-host without AI cost); `anthropic` is the same as unset; any other value stops the boot. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | a key pair (5.12) and `mailto:<your email>` | not set | Web Push for due reminders (Shelf 12-notify). All three or none; mark the private key **Sensitive**. Unset, partial or malformed = "not configured": Settings › Notifications shows only the device part and nothing is sent (one boot warning names the variable, never a value). Redeploy after setting. |

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

- **CSP and security headers** for the web are set in `vercel.json` and the middleware (ADR 0022), tested by an e2e check for CSP violations. Static CSP (files, set in `vercel.json`): `default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: https://*.googleusercontent.com https://avatars.githubusercontent.com; connect-src 'self'; frame-src https:; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'`. `/api/*` gets no CSP from `vercel.json`: helmet sets it there.
- **Nonce:** component styles (`libs/ui`, CDK overlays) are added at runtime, so HTML documents get a per-request nonce from the Vercel Routing Middleware `middleware.ts` (`ngCspNonce` in `index.html`, `Cache-Control: private, no-store`); `'unsafe-inline'` stays out. Document CSP template (`{nonce}` is a fresh 128-bit base64 value): `default-src 'self'; script-src 'self'; style-src 'self' 'nonce-{nonce}'; font-src 'self'; img-src 'self' data: https://*.googleusercontent.com https://avatars.githubusercontent.com; connect-src 'self'; frame-src https:; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'`. The middleware code is in `libs/web/csp`; `nx run web:middleware-shell` (part of `buildCommand`) bundles the built `index.html` into it. On the first preview deployment check: `curl` of `/` shows one CSP whose nonce equals `ngCspNonce` in the body, two requests differ, the security headers are present, a hashed asset gets the static CSP, `/missing.js` is 404.
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

### 5.8 Demo cleanup cron (`CRON_SECRET`)

The demo sign-in (#67) creates a 24 hour sandbox user per visitor. A Vercel Cron job calls `GET /api/cron/demo-cleanup` daily at 03:17 UTC (`crons` in `vercel.json`, within the Hobby limit of once per day) and deletes expired demo users with all their data.

- [ ] Generate the secret yourself: `openssl rand -base64 48` (at least 32 characters; shorter counts as unset).
- [ ] Vercel → Settings → Environment Variables → add `CRON_SECRET` for **Production** only, mark it **Sensitive**, then redeploy. Vercel adds `Authorization: Bearer <CRON_SECRET>` to each cron request by itself.
- [ ] Without the variable the route answers 401 to everyone (fails closed) and expired sandboxes are never deleted, though they stop working after 24 hours.
- [ ] After the first deploy: Vercel → Settings → Cron Jobs shows `/api/cron/demo-cleanup`; use **Run** once and check the response `{ "deleted": …, "hasMore": false }` in the logs.

### 5.9 Browser extension (#445)

The extension is `apps/extension`, a Chrome Manifest V3 popup. It asks for `activeTab`, `contextMenus` (right-click "Save link / Save page to Shelfmark", from 1.3.0; no install warning) and host access to the Shelfmark API only, plus the optional `tabs` for All tabs, and it uses the session cookie of the app in the same browser (ADR 0046). There are two builds:

| Build | Command | Output | Talks to |
| --- | --- | --- | --- |
| Development | `npm run extension:dev` (or `npm run extension:watch` to rebuild on every change) | `dist/apps/extension-dev` | `http://localhost:4200` (the web dev server, which proxies `/api` to the local API) |
| Store | `npm run extension:package` (builds first) | `dist/apps/extension` and `dist/shelfmark-extension-<version>.zip` | `https://shelfmark-app.vercel.app` |

**Try it locally (unpacked development build).** Outside production the API trusts any extension id, so no variable is needed.

1. Start the app with its API on the real local database (section 1, "Mock or real data"): export `BETTER_AUTH_SECRET`, run `npx nx run api:db-migrate` once for a new checkout or worktree (an empty local database answers 500), then `npm run start:all`.
   - Open http://localhost:4200 in the same Chrome profile, run `localStorage.setItem('sm-real-auth-api', '1')` in the console and reload. Without it the web app signs in on its in-browser mocks, no session cookie is set and the extension shows "Sign in".
   - Sign in with **Try demo** (at most 5 demo sessions per hour) or a local OAuth app.
2. Build: `npm run extension:dev`, or keep `npm run extension:watch` running while you test.
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and choose `dist/apps/extension-dev`. Pin "Shelfmark (dev)" in the toolbar puzzle menu.
4. Open any web page and click the icon, or press **Alt+Shift+S** (change it at `chrome://extensions/shortcuts`).
5. After a rebuild, press the reload arrow on the extension's card. To see errors, right-click the popup → **Inspect**.

The store build can also be loaded unpacked (`dist/apps/extension`). It saves to production only after the API change is released and `EXTENSION_ORIGINS` holds its id (below); before that, Save answers 403.

**Chrome Web Store** (you do these steps; agents never publish). The listing texts, the privacy answers and the images are in [`docs/store/extension/`](store/extension/README.md).

- [ ] Developer account: https://chrome.google.com/webstore/devconsole, sign in with the Google account that should own the item, pay the one-time $5 fee, turn on 2-step verification and verify the contact email.
- [ ] `npm run extension:package`, then **New item** → upload `dist/shelfmark-extension-<version>.zip`. Uploading creates a draft and gives the item its permanent id (32 letters a–p, on the item's page and in its URL).
- [ ] Vercel → Settings → Environment Variables → `EXTENSION_ORIGINS` = `chrome-extension://<item id>` for **Production** (a comma-separated list if an Edge Add-ons copy is added later), then redeploy. Without it the published extension can sign in but every Save gets 403.
- [ ] **Store listing** tab: description, category, language, the 128 px icon (`apps/extension/public/icons/icon-128.png`), the screenshots and the small promo tile from `docs/store/extension/`.
- [ ] **Privacy practices** tab: the single purpose, a justification for `activeTab`, `contextMenus`, the optional `tabs` and the host permission (all in `docs/store/extension/listing.md`), the data usage answers and the privacy policy URL `https://shelfmark-app.vercel.app/privacy`, all from `docs/store/extension/listing.md`.
- [ ] **Distribution**: **Unlisted** for a first round with a few people, **Public** later; all regions.
- [ ] **Submit for review**. A first review usually takes a few days; the dashboard emails the result.
- [ ] Every update: raise `version` in `apps/extension/manifest/production/manifest.json` (and the development manifest), package, upload, submit again.

Edge, Brave and Arc install straight from the Chrome Web Store (Edge asks once to allow extensions from other stores). A separate Edge Add-ons listing is optional and gets its own id, which then goes into `EXTENSION_ORIGINS` too.

### 5.10 Extension store link in the web app (#455)

The web app offers the browser extension (5.9) to signed-in people on a desktop Chrome, Edge, Brave or Arc (a banner in the library and a "Browser extension" row in Settings › Library › Saving). Both read one constant and render nothing while it is empty. The landing only mentions the extension, without a link.

- [ ] After the Chrome Web Store item is published (5.9), copy its public URL (`https://chromewebstore.google.com/detail/<name>/<item id>`).
- [ ] Put it into `EXTENSION_STORE_URL` in `apps/web/src/app/models/extension-store-url.const.ts` (a one-line PR into `stage`, or ask an agent to do it).
- [ ] After the release, open the library and Settings › Library in desktop Chrome: Install opens the store page. In Firefox, Safari or on a phone nothing is shown.


### 5.11 AI provider (#389)

AI is opt-in per user (Settings › AI) and runs on Anthropic's API (ADR 0047: Claude Haiku 5.5 for link jobs, the Message Batches API for "Process existing links"). Without a key the app uses the built-in mock provider, so nothing below is needed for local work, CI or previews. The job runner and its timing are in [ADR 0049](adr/0049-ai-job-runner-on-vercel.md).

- [ ] Anthropic Console (console.anthropic.com): create an account and an organisation for Shelfmark, add a payment method and buy the smallest credit amount.
- [ ] Console → **Limits** (Billing → Spend limits): set a **monthly spend limit of $10**. It is the backstop behind the per-user quotas; at two users the expected cost is about $1–2 a month.
- [ ] Console → **API keys** → **Create key** (name it `shelfmark-production`, in a workspace of its own if you use workspaces). Copy it once into your password manager.
- [ ] Vercel → Settings → Environment Variables → `ANTHROPIC_API_KEY` for **Production** only, **Sensitive** (5.3). Never Preview, never Development, never a file. `ANTHROPIC_BASE_URL` is ignored: the code pins Anthropic's own host.
- [ ] `AI_FULL_ACCESS_EMAILS` for **Production** (5.3), then redeploy.
- [x] Data terms for the privacy page (checked Nov 18, 2026, Anthropic privacy centre and API docs): API inputs and outputs are deleted within **30 days**; content flagged by trust and safety systems may be kept up to 2 years, and longer where the law requires; commercial API data is not used for training by default. The privacy page AI section and the AI intro name **Anthropic PBC (USA)** and these terms. Re-check before each release that changes the provider or model (Covered Models such as Fable require 30-day retention too; zero data retention is by agreement only).
- [ ] Vercel → Settings → **Functions**: check that **Fluid compute** is on (the default for new projects) and that `api/index.mjs` shows **Max Duration 30 s** after the next deploy. `vercel.json` sets `maxDuration: 30` (ADR 0049): requests still time out at 8 s (`REQUEST_TIMEOUT_MS`), the extra time is for AI work that runs after the response with `waitUntil`.
- [ ] Vercel → Settings → **Cron Jobs** shows `/api/cron/ai-sweep` (daily at 04:17 UTC, `vercel.json`). It uses the same `CRON_SECRET` as the other crons (5.8) and answers 401 without it. Use **Run** once and check the response `{ "failed": …, "deletedDrafts": …, "users": … }`; the catch-up itself runs after the response. If Hobby ever refuses a third cron, tell an agent: the sweep can move into the Trash cleanup handler (ADR 0049).
- [ ] After the release: sign in with an account from `AI_FULL_ACCESS_EMAILS`, turn AI on, save a link and check that suggestions and a summary appear; the Console → **Usage** page shows the call. Demo sandboxes always use the mock and never reach Anthropic.
- [ ] Rotation follows section 6: create the new key, update Vercel, redeploy, then delete the old key in the Console.
- [x] **Voyage AI, before AI-3 goes to production** (done by the author on Nov 18, 2026: payment method added, training opt-out set, zero-day retention) (checked Nov 18, 2026, Voyage FAQ and Terms of Service): Voyage may use API data to train its models **unless the organisation opts out**. In the Voyage dashboard add a payment method (required for the opt-out), set a monthly usage limit if Billing offers one, then, as the organisation admin, opt out of data use for training in the **Terms of Service** section. The opt-out cannot be undone in the dashboard and covers only data sent after it; with it Voyage deletes each request right after processing (zero-day retention). The privacy page AI section already describes this state, so it must be true before AI-3 is released.

### 5.12 Web Push for reminders (Shelf 12-notify)

Reminders reach a closed Shelfmark through Web Push (VAPID, RFC 8292). Without the keys the app works as before (reminders wait in Today); nothing below is needed for local work, CI or previews.

- [ ] Create a key pair once on your machine: `npx web-push generate-vapid-keys` (from the repo, the package is a dependency). Store both values in your password manager.
- [ ] Vercel → Settings → Environment Variables (Production only): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (**Sensitive**) and `VAPID_SUBJECT` = `mailto:<your email>` (5.3), then redeploy. Changing the key pair later makes every stored subscription useless: people turn notifications on again.
- [ ] **Step 1, BEFORE deploying this change: enable Vercel Schedules (beta) for the team** (Vercel dashboard, team settings; the overview says all plans, the SDK README says a deploy with `schedules` fails unless the team has it enabled). Without it the deploy fails.
- [ ] After the deploy: Vercel → project → **Schedules** lists exactly three: `notifications` (`*/15 * * * *`), `account-purge` (`37 2 * * *`) and `ask-history` (`27 4 * * *`), all `GET` path targets calling `/api/cron/...` with the same `CRON_SECRET` (5.8). Use **Run once** on `notifications` and check `{ "configured": true, "sent": …, "removed": …, "quiet": …, "skipped": …, "hasMore": … }`. Due reminders now arrive within about 15 to 30 minutes (15-minute cadence plus Hobby's 15-minute jitter). The route is idempotent (a reminder is pushed once even if runs overlap or a delivery repeats); reminders older than 24 hours (an outage) are not pushed.
- [ ] Run budget (Hobby, 5,000 runs per billing period, scheduled and manual; over it runs are skipped until the next period): `notifications` 96 a day is 2,976 in a 31-day month, `account-purge` and `ask-history` 62 together, 3,038 in all, leaving about 1,960 for manual runs. The Cron Jobs below are a separate feature.
- [ ] Cron Jobs that remain in `vercel.json` (Settings → **Cron Jobs**): `/api/cron/demo-cleanup`, `/api/cron/trash-cleanup` and `/api/cron/ai-sweep`, each daily. They must not list the three routes above (the project would run them twice).
- [ ] After the release: Settings › Notifications on a desktop Chrome, turn notifications on, **Send a test**: the notification arrives through the push service.
- [ ] Vercel → **Schedules** also shows `account-purge` (`/api/cron/account-purge`, daily at 02:37 UTC): it deletes accounts whose 7-day deletion grace period is over (Shelf 05-settings), with the same `CRON_SECRET`.
- [ ] Vercel → **Schedules** also shows `ask-history` (`/api/cron/ask-history`, daily at 04:27 UTC): it deletes Ask conversations 30 days after their last turn (ADR 0055 amendment), with the same `CRON_SECRET`.

#### Vercel to-do for the Shelf redesign

One Vercel project serves both the web app and the API (`vercel.json` at the repo root), so every variable below is set on that project. Names only; values never go into the repo.

| Variable | Part | Environments | What it is for | How to get the value |
| --- | --- | --- | --- | --- |
| `VAPID_PUBLIC_KEY` | api (sent to the web through `/api/me/notifications`) | Production | Web Push: the browser subscribes with it | `npx web-push generate-vapid-keys` once, the "Public Key" line |
| `VAPID_PRIVATE_KEY` | api | Production, **Sensitive** | Web Push: signs each push | same command, the "Private Key" line; keep it in your password manager |
| `VAPID_SUBJECT` | api | Production | Web Push contact for the push services | `mailto:<your email>` |
| `CRON_SECRET` | api | Production, **Sensitive** | already set (5.8); the three schedules use it too | nothing new |

Not needed: Preview (crons and push are Production only; without the keys Preview shows "not configured"). The Reader text fetcher, reading progress, Ask history, saved views and account deletion add no variables. Weekly email is postponed: no mail provider variables yet.

New schedule entries in `vercel.json` (the `schedules` key, Vercel Schedules, enable them for the team first, 5.12; all with `CRON_SECRET`, Production only):

- [ ] `notifications` → `/api/cron/notifications`, `*/15 * * * *`: pushes due reminders.
- [ ] `account-purge` → `/api/cron/account-purge`, `37 2 * * *`: deletes accounts after the 7-day grace period.
- [ ] `ask-history` → `/api/cron/ask-history`, `27 4 * * *`: deletes Ask conversations older than 30 days.

## 6. Secrets policy

| Secret | Lives in | Never in |
| --- | --- | --- |
| Neon connection strings | Vercel env (via integration); GitHub Environment secret only if CI migrates | repo, chat, issues, logs |
| OAuth client secrets, Better Auth secret | Vercel env (Production / Preview); local ones only on your machine | repo, chat, issues, logs |
| AI provider keys (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`) | Vercel env, Production only | Preview, Development, local shells, repo, chat, issues, logs |
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
| 2 | Verify secret scanning, push protection, Dependabot, merge methods (squash and merge commits, ADR 0035) | GitHub settings | author | CI task |
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
| 17 | `CRON_SECRET` (32+ characters) in Vercel Production for the demo cleanup cron | Vercel env | author | demo sign-in (#67) |
| 18 | Chrome Web Store developer account ($5), item upload, `EXTENSION_ORIGINS` with the item id, listing, submit (section 5.9) | Chrome Web Store, Vercel env | author | browser extension (#445) |
| 19 | Chrome Web Store URL of the published extension in `EXTENSION_STORE_URL` (section 5.10) | `apps/web` models | author | extension store link (#455) |
| 20 | Anthropic Console account, $10 monthly spend limit, API key (section 5.11) | console.anthropic.com | author | AI foundation (#389) |
| 21 | `ANTHROPIC_API_KEY` (Production only, Sensitive) and `AI_FULL_ACCESS_EMAILS` in Vercel; `VOYAGE_API_KEY` stays as is for AI-3 | Vercel env | author | AI foundation (#389) |
| 22 | Fluid compute on, `maxDuration` 30 s visible, `/api/cron/ai-sweep` listed and run once | Vercel project settings | author | AI foundation (#389) |
| 23 | Provider retention period, region and no-training statement copied for the privacy page | Anthropic terms | author | AI foundation (#389) |
| 24 | VAPID key pair and subject in Vercel Production; Vercel Schedules enabled for the team first, then the 3 schedules (`notifications` every 15 minutes) listed and `notifications` run once (section 5.12) | Vercel env, scheduler | author | Shelf notifications |

The showcase builds only from `main`: `ignoreCommand` in `libs/ui/vercel.json` skips every other branch (issue #50), so PRs create no `shelfmark-ui` deployments and the Hobby deployment limit is spent on the app project. Storybook on PRs is checked by CI (`nx test-storybook ui`).
