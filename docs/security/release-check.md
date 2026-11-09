# Stage-1 release security check (issue #110)

Judged against `origin/main` @ 803937d (2026-11-08). Read-only: no repo files changed. Evidence paths are relative to the repo root and read via `git show origin/main:<path>`.

> **Update after the night of Nov 8–9, 2026.** Gap 1 (export rate limit) is fixed by #192 (`@RateLimit(RATE_LIMIT.Export)`, 429 test). The red `e2e` on main is fixed by #188 (landing layout shift). #149 (link images, PR #193) got its own code and security review (PASS); its rows are noted below. Still open: privacy page (#101), Neon preview isolation (author check), production scan (author, from a networked machine), CodeQL / secret-scanning alert counts (author, repository settings).

> **Final update, Nov 9, 2026 (author checks done with the author).** All four gaps are closed or accepted:
> - **(1) Export rate limit:** fixed by #192.
> - **(2) Privacy page:** live at `/privacy` (#202). The URL is set as the privacy policy link on the Google OAuth consent screen, and `shelfmark-app.vercel.app` is an authorized domain.
> - **(3) Neon preview isolation:** verified. The Preview environment in Vercel has no shared `DATABASE_URL`. The only Preview database variables are branch-scoped ones that the Neon integration created for `feat/67-demo-web` and `feat/76-tags-api`, each on its own child branch. Branch deployments stay off on purpose (`git.deploymentEnabled`, Hobby deployment cap).
> - **(4) Production scan:** run, see "Production checks" below.
>
> Also confirmed on production:
> - **API boot:** the API failed to boot on Vercel (`ERR_REQUIRE_ESM` from `@nestjs/throttler`) from #132 until #204. It is fixed, and a test now loads the built entry the way Vercel does.
> - **Health and cron:** `/api/health` answers 200. `/api/cron/demo-cleanup` answers 401 without the secret. `CRON_SECRET` is set in Production; the first scheduled run is checked in the Vercel cron logs.
> - **Link images:** a new link gets its preview image through `sharp` on Vercel.
>
> Security tab:
> - **Code scanning:** 0 open alerts (2 closed).
> - **Secret scanning:** 0 open, 0 closed.
> - **Dependabot:** 2 open, both in transitive dev dependencies:
>   - minimatch (moderate), through `eslint`;
>   - deepmerge (low), through `@nx/webpack`.
>
>   `npm audit --omit=dev` reports 0. The author accepted them as a known risk for stage 1; follow-up in #205.

## Summary

- 5.8 rows and related measures checked: 17. **Done: 13. Gap: 4.**
- Gaps: (1) export has no stricter rate limit (known TODO), (2) privacy page missing (#101 open), (3) Neon preview branches not verifiable from code and `vercel.json` disables branch deployments, (4) production header/CSP scan not run (vercel.app unreachable from this sandbox).
- `npm audit --audit-level=high`: exit 0, 0 high, 0 critical (28 moderate, 2 low).
- CodeQL: default setup is `configured` (javascript-typescript, actions, weekly) and both `Analyze` check runs passed on main. Open alerts could not be read (token returns 403), so "0 critical/high" is **not confirmed**.
- Main CI is currently red: `e2e` fails on the landing layout-shift test (CLS), fixed by open PR #188. Not a security finding, but it blocks the required `e2e` check for release.
- The 5.8 "XSS / SSRF / IDOR / CSRF" core measures are solid. No critical or high findings on main. One medium (export rate limit).

## 5.8 table

| # | Row | Status | Evidence | Fix (gaps) |
|---|-----|--------|----------|-----------|
| 1 | SSRF guard | done | `apps/api/src/fetcher/safe-fetcher.service.ts`: http/https only, no credentials, ports 80/443 only, own DNS resolve, all answers must be allowed, connection pinned to validated IPs (no rebinding), every redirect hop re-validated, no cookies/auth headers, `agent:false` and proxy env ignored, 3 s connect / 8 s total (preview 6 s), 2 MB body cap, 5 redirects (preview 3), identity encoding, HTML content types only. `ip-policy.ts` + `blocked-ip-ranges.const.ts`: 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, CGNAT, ULA, link-local, mapped/compatible IPv6 unwrapped, NAT64/6to4/Teredo, non-canonical literals fail closed; `.localhost/.local/.internal` blocked. `link-preview.service.ts` returns one identical fallback for every failure (no probing oracle). Tests: `ip-policy.spec.ts`, `safe-fetcher.service.spec.ts`, `links.preview.integration.spec.ts`. Only outbound fetch besides it: Sentry tunnel (`monitoring.service.ts`), target built from own DSN config, `redirect:'error'`, timeout, no cookies. | none |
| 2 | IDOR / data isolation | done | Every service filters by session `userId` (`links`, `links-write`, `folders`, `tags`, `feedback`, `export`); raw SQL is bound and has `user_id =` (`links-write.service.ts:165`, `folders.service.ts:116`). Foreign id gives 404. Tests: `links.isolation.integration.spec.ts`, `folders.integration.spec.ts` ("data isolation", foreign parent/move/delete), `tags.integration.spec.ts` ("isolates tags between users", merge foreign 404), `feedback.integration.spec.ts` ("data isolation"), `export.integration.spec.ts` ("never exports another user data", foreign folderId 404), `users.delete-account.spec.ts` ("leaves the data of another user untouched"), `demo.library.integration.spec.ts`, harness `isolation-harness.spec.ts`. Global guard: `SessionAuthGuard` as `APP_GUARD`; `route-protection.spec.ts` fails if the public-route list drifts (`PUBLIC_ROUTES`: health, monitoring config/tunnel, demo create, cron cleanup). #149 adds `GET /links/:id/image|favicon` filtered by `userId` (`link-images.service.ts`), foreign = 404. | none |
| 3 | XSS | done | No `innerHTML`, `bypassSecurityTrust*`, `DomSanitizer`, `outerHTML`, `eval` in `apps/web/src` or `libs/ui/src` (only a comment in `illustration.component.ts`). `javascript:`/`data:`/`vbscript:` rejected on the API: `IsHttpUrl` (`links/dto/is-http-url.decorator.ts`: http/https only, no credentials, no control chars, max 2048) on create, update, preview, and the client hints `faviconUrl`/`imageUrl`. Client re-check: `safeHref()` (`features/links/link-view.ts`) used by card, row and recent panel. Export HTML is escaped (`export/escape-html.ts`, spec). CSP `script-src 'self'` (no inline/eval). Third-party images are blocked by `img-src 'self' data:` (ADR 0027). | none. #149 keeps this: images are decoded and re-encoded to WebP with `sharp`, served with `nosniff`, CORP `same-origin`, `Content-Disposition: inline`. |
| 4 | Sessions and CSRF | done | `auth/create-auth.ts`: `useSecureCookies` = production (so `__Secure-` prefix + Secure), `httpOnly: true`, `SameSite=Lax` (needed for the OAuth callback), `disableOriginCheck:false`, no cookie cache (sign-out/revoke effective immediately), 7-day session with 1-day sliding, OAuth tokens stripped before storing (`strip-oauth-tokens.ts`), `isDemo`/`demoExpiresAt` `input:false`. `CsrfGuard` (global `APP_GUARD`) for POST/PUT/PATCH/DELETE: untrusted `Origin` 403, `Sec-Fetch-Site: cross-site` 403, no-Origin only same-origin/none, body must be `application/json` (415). Sentry tunnel exemption (`csrf-content-type-exempt-route.const.ts`) is exact method + path, content-type rule only; Origin and Sec-Fetch-Site still apply (specs: "lets text/plain through with the trusted Origin", "still rejects text/plain on any other route", "does not exempt another method on the tunnel path"). Auth routes behind an allow-list middleware (`auth-allow-list.middleware.ts`) and `disabledPaths`. Tests: `auth.security.spec.ts` (foreign-origin sign-out, login CSRF/state, no CORS), `csrf.guard.spec.ts`, `route-protection.spec.ts` (401 for no/forged/signed-out cookie). | none |
| 5 | Invalid data / DTO validation | done | Global `ValidationPipe` `whitelist`, `forbidNonWhitelisted`, `forbidUnknownValues`, `transform`; JSON body limit 100 kb (`configure-app.ts`). Limits in `libs/shared/contracts` (`LINK_LIMIT`: url 2048, title 300, note 2000, 20 tags, 10 000 links per user; tag/folder/feedback/user limits), `NoControlChars`, `ParseUUIDPipe`/`IsUUID`, `__proto__` test in `configure-app.spec.ts`, `links.hardening.integration.spec.ts`. | none |
| 6 | API abuse / rate limits | **gap** | Done: global `ThrottlerGuard` 120/min per IP; `RATE_LIMIT.Preview` 20/min on preview, `AddLink` 30/min on create and on the Sentry tunnel, `Demo` 5/h, `Feedback` 10/min, `Auth` 20/min via `auth-rate-limit.middleware.ts` (sign-in, callback, sign-out). Tests in `rate-limit.integration.spec.ts`. **Gap:** `export.controller.ts` has `// TODO(#123, PR #132): apply @RateLimit(RATE_LIMIT.Export)`; `RATE_LIMIT.Export` (5/min) exists but is not applied, so export only gets the default 120/min. 5.8 says export "is also rate-limited". Severity medium: a user can run many full-library streams (up to 10 000 links each). | Add `@RateLimit(RATE_LIMIT.Export)` to `ExportController.export` and an integration test (6th call in a minute gives 429 with `Retry-After`); remove the TODO. |
| 7 | Headers | done on code, production unverified | API: `helmet()` defaults in production (CSP, HSTS, nosniff, CORP same-origin, referrer, etc.); dev relaxes only HSTS and upgrade-insecure-requests (`configure-app.ts`). No CORS (`configure-app.spec.ts` "does not enable CORS", `auth.security.spec.ts`; ADR 0007). Web: `vercel.json` static CSP for files plus HSTS 2 years, `nosniff`, Referrer-Policy, Permissions-Policy, COOP same-origin; per-request nonce CSP for HTML from `middleware.ts` + `libs/web/csp` (ADR 0022, `style-src 'self' 'nonce-…'`, `script-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`). Tests: `apps/web-e2e/src/csp.spec.ts` (nonce equals document nonce, different per request, other security headers on the document, helmet CSP on the API), `deploy-config.spec.ts`, `libs/web/csp/src/lib/*.spec.ts`; `post-deploy-smoke.yml` checks production after every deploy. Low: no `Cross-Origin-Resource-Policy` on web documents/static assets (API has it via helmet; not required by 5.8). | Run the production scan (see gap 4). Optional low: add `Cross-Origin-Resource-Policy: same-origin` to the non-API header block in `vercel.json`. |
| 8 | SQL injection | done | No `$queryRawUnsafe` / `$executeRawUnsafe` anywhere. All raw SQL is tagged-template (bound parameters): advisory locks, `UPDATE links … WHERE id = ${id}::uuid AND user_id = ${userId}::uuid`, recursive folder subtree. LIKE wildcards escaped (`common/util/escape-like.ts`, export `baseWhere`). | none |
| 9 | Secrets | done in repo; GitHub settings not verifiable | `.gitignore` has `.env*` with `!.env.example`; `.env.example` has names only; secrets only in Vercel; `.gitleaks.toml` extends defaults; lefthook pre-commit runs `gitleaks git --staged` and fails closed without gitleaks; CI job `gitleaks` (pinned v8.30.1 with sha256 check), `permissions: {}` at top of `ci.yml`, actions pinned by SHA; `gitleaks` check green on main. Logs: auth logger, `LoggingInterceptor` (method, path pattern, status, duration, request id only; `auth.logging.spec.ts`, rate-limit logging spec), export logs error class only, cron guard never logs the secret. GitHub secret scanning and push protection are repo settings: not checked (token lacks access). | Author: confirm secret scanning + push protection are on (Settings > Advanced Security) and note it in the report. |
| 10 | Dependencies | done (CodeQL alerts not readable) | Dependabot: `.github/dependabot.yml` (root weekly, grouped, plus isolated `tools/lighthouse`). `npm audit` job required in CI (`ci.yml` job `npm-audit`, green on main). Local run on main lockfile: 0 high, 0 critical. CodeQL default setup configured (see below). | Author: open Security > Code scanning and Dependabot alerts and confirm 0 critical/high open. |
| 11a | Account deletion with all data | done | `DELETE /api/me` (`users.controller.ts`, `users.service.ts`): body email must match (400 otherwise), owner from session only, one transaction deleting `Verification` rows by email and the `User`; Prisma `onDelete: Cascade` for sessions, accounts, folders, links, tags, link tags, feedback (`schema.prisma`); session cookie cleared with fallback. Tests: `users.delete-account.spec.ts` (all data gone, other user untouched, foreign id/email deletes nothing, transaction failure deletes nothing). Note: #149 adds a `LinkImage` table; it must cascade from `User`/`Link` (the migration was not fully reviewed) and the delete test should assert it. | Check `LinkImage` cascade when #149 lands. |
| 11b | Privacy policy page | **gap** | #101 open. `sign-in.page.html:51` shows plain text with a comment "until the /privacy page exists". Google OAuth consent screen needs a public privacy URL. | Merge #101 (page + route + link from sign-in and landing footer), then set the URL in the Google OAuth consent screen (author). |
| 12 | Preview deployments on a separate Neon branch | **gap (unverified)** | Documented: ADR 0011, ADR 0026, `docs/SETUP.md` 4 and 5.4 (Neon-Vercel integration, child branch per preview, `migrate-deploy` runs per deployment). It is author-side configuration, so nothing in code proves it. Also `vercel.json` has `git.deploymentEnabled` `"*/**": false`, `dependabot/**: false`, `docs/**: false`: branch deployments appear disabled, so previews may be off or created another way. | Author: confirm in Vercel/Neon that Preview env `DATABASE_URL` points to a preview branch, never `production`, and whether previews are intended to be on; record the screenshot or `neon branches list` output in the report. |
| 13 | Demo limits | done | `POST /api/demo` is the only anonymous write route: `RATE_LIMIT.Demo` 5/h per IP, Postgres advisory lock + quota and cap (`demo.service.ts`, `demo-quota-exceeded.exception.ts`), 24 h sandbox (`DEMO_LIMIT`), max 100 links (`links-write.service.ts:225`), `isDemo` not client-settable, expiry enforced on `get-session` (`enforce-demo-expiry.ts`), isolation for demo users (`demo.library.integration.spec.ts`). Captcha on suspicious activity (5.8 text "for example") is not implemented; the per-IP limit and quota are the control (ADR 0034). | Optional: decide whether a captcha is needed for stage 1 and note the decision in the report. |
| 14 | Demo cleanup cron auth | done | `GET /api/cron/demo-cleanup` (`demo-cleanup.controller.ts`): `@AllowAnonymous()` plus method-level `@UseGuards(CronSecretGuard)`. Guard: `Authorization: Bearer ${CRON_SECRET}`, SHA-256 + `timingSafeEqual`, fails closed with 401 when secret unset or under 32 chars, same 401 for wrong secret, secret never logged, `no-store`. Tests: `cron-secret.guard.spec.ts`, `demo-cleanup.integration.spec.ts`. Cron declared in `vercel.json` (`17 3 * * *`). | none |
| 15 | Export scoping and limits | gap (rate limit only) | Session user only, foreign folder 404, batched streaming (500 rows), per-user link cap bounds size, validated query (`ExportQueryDto`), `attachment`, `no-store`, `nosniff`, HTML escaped, error log without user data. Missing stricter rate limit: see row 6. | See row 6. |
| 16 | Sentry scrubbing | done | API `monitoring/scrub-event.ts` + `scrub-text.ts` (drops request, user, breadcrumbs, extra, server name, frame vars/paths; exception messages replaced; URLs/emails/tokens scrubbed), same rules in web `core/monitoring/scrub-event.ts`; specs `scrub-event.spec.ts`, `scrub-text.spec.ts`. Tunnel forwards only envelopes naming our own DSN, `event` items only, size limit (`read-limited-body.ts`), 30/min, no cookies. | none |
| 17 | Logging and error handling | done | Global `AllExceptionsFilter` (no stack/Prisma text to clients, `all-exceptions.filter.spec.ts`), request id on every response, structured logs without personal data. | none |

## npm audit and CodeQL

- `npm audit --audit-level=high` on the `origin/main` `package.json` and `package-lock.json`, run in a scratch directory (`.../scratchpad/audit`, not in the repo): **exit 0; critical 0, high 0, moderate 28, low 2** (30 total; the moderates are the `@angular-eslint` / `@typescript-eslint` dev-tooling chain). CI job `npm-audit` also passed on main. Lighthouse CI is audited separately (`tools/lighthouse`).
- CodeQL: `GET /code-scanning/default-setup` returned `state: configured`, languages actions + javascript-typescript, default query suite, weekly schedule. The `Analyze (javascript-typescript)` and `Analyze (actions)` check runs on main 803937d concluded `success`. `GET /code-scanning/alerts` and Dependabot alerts returned 403 for this token, so **the open alert count was not checked**.

## Open PRs that touch 5.8 rows (judged on main, not on the branches)

- **#149 link images (feat/149-link-images):** touches SSRF (extends `SafeFetcherService` with an image mode), XSS (untrusted images; re-encoded to WebP with `sharp`, SVG/HTML rejected, `nosniff`, CORP same-origin, CSP stays `img-src 'self' data:`), IDOR (new `GET /links/:id/image|favicon`, filtered by `userId`, foreign = 404), dependencies (new `sharp` 0.35.5 native dependency, `vercel.json` `includeFiles` adds `node_modules/@img/**`), account deletion (new `LinkImage` table). Only the controller, image service, `process-link-image.ts` and `send-link-image.ts` were read; the fetcher changes and migration need a full `security-reviewer` pass before merge, and `npm audit` must be re-run on its lockfile.
- **#100 web rating (feat/100-rating-web):** web-only UI over the feedback API already on main (`RATE_LIMIT.Feedback`, isolation test). No 5.8 row changes; check it uses no `innerHTML` and Transloco keys.
- **#188 landing CSS:** CSS only, no 5.8 impact. Needed to turn main CI green.
- **#186 CI (ci/186-storybook-a11y-speed):** `.github/workflows/ci.yml` (3 lines), Storybook a11y config. The diff has no change to permissions, secrets, audit or gitleaks lines; no 5.8 impact.
- **#178** (Dependabot jsdom 31, dev dependency) and **#101** (privacy page, closes gap 11b).

## Production checks

Run by the author from a networked machine against `https://shelfmark-app.vercel.app` on Nov 9, 2026, after #204:

```bash
BASE_URL=https://shelfmark-app.vercel.app npx nx e2e web-e2e
```

**Results:**
- **Headers:** every deployed-URL check in `csp.spec.ts` passed except the nonce comparison:
  - a different nonce per request;
  - `nosniff` and HSTS on the document;
  - the static CSP on hashed assets;
  - helmet CSP without a nonce on `/api/health`.
- **The nonce comparison** failed only because production serves the attribute as lower-case `ngcspnonce`, while its value matched the header nonce. The spec was too strict and is fixed in #208.
- **Public pages, desktop:** smoke, privacy, PWA and landing (including the axe scans in light and dark) passed.
- **Public pages, phone:** they ran after the desktop project and got `403` or empty pages, including a second run with `--workers=1`. Vercel's system **DDoS Mitigation** rule challenged the author's IP for ten minutes at a time (Firewall: 122 challenged requests, in two windows). That is the platform protecting production, not an app failure; the same specs pass on phone in CI against the production build.
- **Specs not meant for production** (`*mock auth*`, `sign-in-real-api`, `settings`, and anything that routes `/api` or needs the mock data layer) cannot pass against a deployed site: there is no mock sign-in there, and the PWA service worker answers before `page.route`.

**How to scan production next time:** run only the public, deployed-URL specs, in one worker and one project at a time, with a pause between projects so the DDoS rule does not engage:

```bash
BASE_URL=https://shelfmark-app.vercel.app npx playwright test -c apps/web-e2e/playwright.config.mts --project=desktop --workers=1 csp.spec.ts smoke.spec.ts privacy.spec.ts pwa.spec.ts landing.spec.ts
```

`post-deploy-smoke.yml` keeps checking the production CSP, nonce, 404 and `/api/health` after every deploy.

## Gaps as proposed issues

1. **fix(api): rate-limit GET /api/export with RATE_LIMIT.Export** (medium) - apply the existing 5/min preset to `ExportController.export`, add a 429 integration test, remove the TODO; blocks release (5.8 API abuse / Demo and export).
2. **feat(web): privacy policy page** - already #101; add `/privacy` route, link from sign-in and landing, set the URL on the Google consent screen.
3. **chore: verify Neon preview branch isolation** - confirm the Preview env uses a child Neon branch, clarify the `vercel.json` `git.deploymentEnabled` settings, attach evidence to the release report.
4. **chore: run production header, CSP and e2e scan** - run `BASE_URL=https://shelfmark-app.vercel.app npx nx e2e web-e2e` and a header check from a networked machine; record in `docs/security/release-check.md`.
5. **chore: confirm CodeQL, Dependabot and secret-scanning alerts are 0 critical/high** - read Security tab, record counts (token here could not).
6. **fix(web): merge #188 so main CI e2e is green** - landing layout-shift test fails on main; needed before the release PR.
7. **chore(web): add Cross-Origin-Resource-Policy to non-API headers in vercel.json** (low, optional).
8. **chore: security review of #149 before merge** - full pass on the fetcher image mode, `LinkImage` migration cascade, delete-account test, `sharp` audit.
9. **docs: write `docs/security/release-check.md`** from this report with evidence links once the issues above are closed.
