# 0026. OAuth on preview deployments

- Status: Accepted
- Date: 2026-11-07
- Source: issue #68; `docs/SETUP.md` 4, 5.3, 5.4; `docs/PROJECT.md` 5.4, 5.7, 5.8; [0012](0012-better-auth-oauth.md), [0013](0013-vercel-hobby-hosting.md), [0019](0019-vercel-deployment-architecture.md)

Number note: 0025 is skipped on purpose; it is expected to be taken by the database tooling ADR of issue #63.

## Context

Sign-in is Google and GitHub OAuth through Better Auth, with routes under `/api/auth/*` and callbacks at `/api/auth/callback/<provider>` ([0012](0012-better-auth-oauth.md)). Web and API share one origin, and the session cookie is host-only on that origin ([0013](0013-vercel-hobby-hosting.md)). Production is `https://shelfmark-app.vercel.app`. Every PR gets a Vercel preview with its own database branch, behind **Vercel Authentication** ([0019](0019-vercel-deployment-architecture.md)). Only the author opens previews.

Facts checked on 2026-11-07:

- **Vercel URLs.** Each deployment has `shelfmark-app-<hash>-<scope>.vercel.app`, and each branch has `shelfmark-app-git-<branch>-<scope>.vercel.app` (scope `reacts-projects-581acec8`). Labels over 63 characters are truncated. The branch URL stays the same only within one branch. A domain, including a free `*.vercel.app` name, can be assigned to one Git branch as a Preview domain. The Vercel Authentication cookie works for one URL only. Standard Protection protects every deployment URL except the production domain.
- **Google.** Redirect URIs must match exactly. Wildcards are rejected. Redirect hosts must also be listed as authorized domains on the branding page. `vercel.app` is on the Public Suffix List, so every `*.vercel.app` name counts as its own domain.
- **GitHub OAuth app.** It has one callback URL. Since 2026-08-03, **wildcard matching** is a per-callback setting. When it is on, any subdomain and any subpath of the callback URL is accepted. It was switched on for apps that existed before that date. Preview hosts are not subdomains of `shelfmark-app.vercel.app`, so wildcard matching does not help us. It only widens what an attacker can use as a redirect target. A **GitHub App** allows up to 10 exact callback URLs, which is still too few for one URL per preview.
- **Better Auth `oAuthProxy` plugin.** Its docs say it is "intended for local development and trusted preview deployments". The provider redirects to `productionURL`. That server exchanges the code and sends the profile to the preview, encrypted in URL query parameters (default `maxAge` 60 s). The preview then creates the user and session in its own database. Every participating environment, **including production**, must share one `OAUTH_PROXY_SECRET`. The docs warn: "Holders of the proxy secret can assert provider identities to participating deployments and obtain sessions … Keep it out of preview deployments that run untrusted contributor code." Every preview origin must be added to `trustedOrigins` on the production server; wildcards such as `https://shelfmark-app-*-<scope>.vercel.app` are allowed. Production and all previews must run the same Better Auth version.
- **Demo sign-in** (#67) is in the same milestone as OAuth (#64). It is the stage 1 path that needs no provider at all ([0012](0012-better-auth-oauth.md)).
- **E2E** never drives real Google or GitHub sign-in: bot detection, 2FA and provider terms rule it out. E2E signs in with the demo flow or a seeded session, whatever we pick here.

## Options

### 1. Better Auth OAuth proxy through production

All previews start OAuth with the production clients. Production handles the callback and sends the profile back to the preview.

- **Security.** The proxy secret sits in the Preview environment, so every preview build and runtime has it. That includes code written by agents and every npm dependency loaded there. With that secret, anyone can make production accept any Google or GitHub identity, the author's included. One leak from a preview is enough to take over accounts on production. Production must also add wildcard preview origins to `trustedOrigins`. Vercel URLs are a shared namespace: anyone can create a project named `shelfmark-app-x-reacts-projects-581acec8`, and its production URL would match the wildcard. That gives an open redirect on production (5.8). The encrypted profile goes into the preview URL, so it lands in browser history and Vercel request logs; it stays valid for up to 60 s. State and PKCE are carried inside the encrypted state, so production never needs the preview's state cookie. Cookies stay host-only. Vercel Authentication: the return redirect lands on a preview URL the author has already opened, so its cookie is there. If the browser does not send that cookie on the cross-site redirect, Vercel adds an SSO hop, which has to fit inside the 60 s window.
- **Setup cost.** Low: one extra secret in Production and Preview, plus the plugin in code. A Better Auth upgrade means production and all previews must switch over together, and preview OAuth stays broken until the upgrade reaches production.
- **E2E.** No change. OAuth is still not automated.

### 2. Stable preview alias with its own OAuth clients

A long-lived branch (for example `preview-oauth`) gets a fixed domain such as `shelfmark-app-preview.vercel.app`. A separate Google client and GitHub OAuth app are registered for it. Other previews get no OAuth.

- **Security.** The production clients and secrets never reach a preview, and nothing is added to production. Each client has one exact callback. Cookies stay host-only. The alias is a preview domain, so Vercel Authentication protects it. A leak of the preview client secret affects only the alias and its test data. A second authorized domain is needed in the Google project (or a second Google project).
- **Setup cost.** Medium. The author creates two clients, one domain and one branch, and configures branch-scoped env vars. To test OAuth for a PR, its code must be moved onto the alias branch. That needs a force push or merge into a shared branch, which agents must not do, or a manual alias of each deployment. The base URL of the alias differs from that of other previews.
- **E2E.** No change.

### 3. Demo sign-in only on previews; OAuth on localhost and production (recommended)

Previews have no OAuth client configured. The API registers a provider only when its client ID and secret are both set. The sign-in screen shows only the enabled methods. Previews offer demo sign-in only.

- **Security.** This option has the smallest attack surface. No provider secret and no proxy secret reaches the Preview environment. `trustedOrigins` on every environment lists only its own origin, with no wildcards. Production config is not widened in any way. Cookies stay host-only. Vercel Authentication still guards previews, and the demo flow keeps its per-IP rate limit (5.8).
- **Setup cost.** None beyond the local and production clients already planned in `docs/SETUP.md` 4.
- **E2E.** E2E and previews use the same path: demo sign-in. OAuth is checked by hand on localhost with the local clients, and on production after every deploy that touches auth. The provider wiring (callback URL derived from the base URL, providers enabled only when configured) is covered by unit tests in `apps/api`.
- **Cost of this option.** An OAuth bug that only shows on Vercel (cookies behind the proxy, `trust proxy`, base URL) is found on production, not on the preview. Account linking and other OAuth-only flows cannot be shown on a preview.

### 4. Preview-only OAuth hub (proxy anchored on a stable preview alias)

This is Option 1 with Option 2's alias as `productionURL`. Preview clients are registered only for the alias (for example `shelfmark-app-oauth.vercel.app`). The proxy secret and the wildcard `trustedOrigins` live only in the Preview environment, and production does not install the plugin.

- **Security.** A leaked preview secret can mint sessions only on previews, which hold only test data. Production keeps exact origins and its own clients. The cost is a shared-authority secret across all previews, and a hub deployment that must stay protected and on the same Better Auth version as every preview.
- **Setup cost.** Highest: two clients, one domain, one long-lived hub branch kept in sync with `main`, and Preview-only env vars. Every Better Auth upgrade needs a switch-over of the hub.
- **E2E.** No change.

### Rejected outright

- Registering `https://vercel.app/...`, or relying on GitHub wildcard matching. Any Vercel project could then receive authorization codes.
- Adding each preview URL to the Google client by hand. Google offers no API for this on web clients, and it does not scale.

## Decision

Adopt **Option 3**. Previews sign in only through the demo flow. Google and GitHub OAuth run only on localhost (local clients) and production (production clients). This is the only option that adds no credential to previews and widens nothing on production. It costs the author nothing and matches how e2e signs in anyway. If a real need for OAuth on previews appears later (for example account linking in the backlog), move to **Option 4** in a new ADR. **Do not adopt Option 1:** a secret shared with every preview could take over production accounts.

## Consequences

- #64 (Better Auth): each social provider is registered only when both its client ID and secret are present. Production startup fails if a provider expected there is missing, so a misconfigured production cannot silently lose a sign-in method. `trustedOrigins` holds exact origins only. `crossSubDomainCookies` stays off, and no cookie gets a `Domain` attribute. GitHub sends no `redirect_uri` subpaths.
- #66 (sign-in screen): the screen asks the API which sign-in methods are enabled (a public, read-only response in `libs/shared/contracts`) and renders only those. Translation keys cover the case where only demo is available.
- #67 (demo) becomes a hard dependency for testing auth on previews. Demo sign-in must stay enabled on Preview.
- The post-deploy checklist in `docs/PROJECT.md` Status gains one item: after a production deploy that touches auth, sign in with Google and GitHub by hand.
- `docs/SETUP.md` 4 and 5.3 must be updated: the preview row says "no OAuth, demo only", and the Google and GitHub client variables are Production only.
- Revisit this decision if previews need OAuth-only features, or if the product moves to a custom domain. A custom domain would allow subdomain previews, which changes the options.

## Author steps (Option 3)

1. Google Cloud: create only `Shelfmark local` and `Shelfmark production` (`docs/SETUP.md` 4.1). Do **not** create a preview client.
2. GitHub: create only `Shelfmark (local)` and `Shelfmark (production)` (`docs/SETUP.md` 4.2). In each app, open the callback URL settings and make sure **wildcard matching is off**.
3. Vercel → Settings → Environment Variables: scope the Google and GitHub client ID and secret to **Production** only (Sensitive). Preview gets its own Better Auth secret and base URL, but no provider variables. Never add `OAUTH_PROXY_SECRET`.
4. Keep Vercel Authentication on for previews, and keep Git Fork Protection on (the default): Vercel does not deploy PRs from forks until the author approves them.
5. After the first production deploy with #64: sign in with Google and with GitHub on `https://shelfmark-app.vercel.app`. On a preview, check that only demo sign-in is shown and that it works.

## Question for the author

Do you accept Option 3 (demo only on previews)? Or do you want OAuth on previews now, which means Option 4 with its extra setup?
