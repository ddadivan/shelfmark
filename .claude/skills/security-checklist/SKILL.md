---
name: security-checklist
description: Shelfmark security checklist derived from docs/PROJECT.md 5.8 - SSRF, IDOR, XSS, sessions/CSRF, validation, rate limits, headers, SQL injection, secrets, dependencies, privacy, demo and export limits. Use when implementing or reviewing any change that touches user data, outbound requests, auth, rendering of user content, config or dependencies.
---

# Security checklist (PROJECT.md 5.8)

A task is not done until every item that applies to it is checked. Reviewers cite the item number.

## 1. SSRF — link preview fetching (main risk)

- [ ] Only `http:` / `https:` schemes
- [ ] Hostname resolved first; reject loopback, private, link-local, CGNAT, multicast, unspecified and metadata ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, `0.0.0.0/8`, `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped IPv6
- [ ] Connect to the resolved IP (no second resolve — DNS rebinding)
- [ ] Every redirect re-validated; max redirects (≤ 3)
- [ ] Timeout (≤ 8 s total), response size limit, only HTML parsed
- [ ] No cookies or auth headers forwarded; fixed User-Agent

## 2. IDOR — data isolation

- [ ] Every query on links, folders, tags, feedback, export filtered by session `userId`
- [ ] Foreign or missing id → 404 (not 403)
- [ ] Nested ids (folderId, tagIds, parentId) checked for ownership too
- [ ] Tests: user A cannot read, list, change or delete B's data

## 3. XSS

- [ ] No `innerHTML`, `outerHTML`, `bypassSecurityTrust*`
- [ ] `javascript:`, `data:`, `vbscript:` URLs rejected on the backend
- [ ] User text (titles, notes, feedback) rendered as text only

## 4. Sessions and CSRF

- [ ] Cookies httpOnly + Secure + SameSite
- [ ] Origin checked on state-changing requests
- [ ] Limited session lifetime; sign-out invalidates the session server-side
- [ ] Global `SessionAuthGuard`; `@AllowAnonymous()` only on handlers listed in `PUBLIC_ROUTES`; `@CurrentUser()` for the owner; `expectIsolated` test per user-owned resource

## 5. Input validation

- [ ] DTO validation on every input, whitelist + forbidNonWhitelisted
- [ ] Length limits: URL 2048, title 300, note 2000, tag 50, folder 100, feedback 2000

## 6. Abuse

- [ ] `@nestjs/throttler` global; stricter on create link, preview, export, demo (demo: ~5/hour per IP)
- [ ] Demo sandbox limits (≤ 100 links), demo users isolated like real ones

## 7. Headers and CORS

- [ ] Helmet, Content-Security-Policy, HSTS
- [ ] CORS only for the own domain

## 8. SQL injection

- [ ] Only Prisma parameterised queries; no `$queryRawUnsafe` / `$executeRawUnsafe`

## 9. Secrets

- [ ] No secrets in code, config, fixtures, logs or CI output
- [ ] `.env*` git-ignored; only `.env.example` with names
- [ ] Secrets only in Vercel / GitHub environment settings

## 10. Dependencies

- [ ] `npm audit --audit-level=high` clean; no new deps without reason
- [ ] No new install scripts: `npm install-scripts ls` is clean; new ones are denied in `allowScripts` unless approved with a reason in the PR and ADR 0020
- [ ] CodeQL and Dependabot alerts addressed

## 11. Privacy

- [ ] Account deletion removes all user data
- [ ] Logs and Sentry carry `requestId`, no personal data or link contents

## 12. Environments

- [ ] Preview deployments use a non-production Neon branch
- [ ] Prisma migrations never reset a non-local database
