# 0034. Demo sign-in: server-only session plugin, 24h expiry, Postgres abuse limits, cleanup cron

- Status: Proposed
- Date: 2026-11-08
- Source: issue #67; `docs/PROJECT.md` 4 (demo story), 5.4, 5.8, 6.2; builds on [0026](0026-oauth-on-preview-deployments.md), [0029](0029-global-session-guard-and-isolation-harness.md), [0030](0030-better-auth-integration.md), [0031](0031-rate-limiting-and-request-interceptors.md)

## Context

Visitors must be able to try Shelfmark without an account: one click gives a 24 hour sandbox with a seeded library. The demo is the one anonymous route that creates data, so it is the main abuse surface (5.8). Better Auth has no anonymous-user flow that fits (its anonymous plugin keeps the user until linking, and ADR 0030 keeps the router surface minimal). The rate limiter is per instance and best effort (ADR 0031), so it cannot be the hard limit. Vercel Cron can only send `GET` with `Authorization: Bearer ${CRON_SECRET}`.

## Decision

1. **Route.** `POST /api/demo` (6.2) is a Nest route: `@AllowAnonymous()` and an entry in `PUBLIC_ROUTES`, `@RateLimit(RATE_LIMIT.Demo)`, no body (any field is a 400), CSRF guard as for every write, answers 201 with the `get-session` shape and `Cache-Control: no-store`.
2. **Session.** A small Better Auth plugin (`demoSessionPlugin`) adds a `createAuthEndpoint.serverOnly` endpoint, `createDemoSession`. Better Auth never routes a `SERVER_ONLY` endpoint, and the allow-list middleware would block it anyway. `DemoSessionService` (in `src/auth`, because feature modules may not import the integration package, ADR 0029) calls `auth.api.createDemoSession({ body: { userId }, returnHeaders: true })`; the endpoint requires an unexpired demo user, creates the session with `internalAdapter.createSession(userId, false, { expiresAt }, true)` (the fourth argument, `overrideAll`, is what makes the expiry stick; without it the regular 7 days apply) and `setSessionCookie` with `maxAge` equal to the remaining demo time. The Set-Cookie headers are forwarded by the controller. Verified on better-auth 1.7.18.
3. **Expiry, four places.** `user.additionalFields.demoExpiresAt` (`input: false`); `SessionAuthGuard` answers 401 for a demo user past `demoExpiresAt` or without one (fail closed); the `get-session` after-hook returns `null` in that case and caps `session.expiresAt` at `demoExpiresAt` (a sliding refresh cannot extend a sandbox); the cron job deletes the user.
4. **Abuse controls, independent of the throttler store.** Postgres: `demo_source_hash` holds an HMAC-SHA256 of the client IP key (the same key the throttler uses), keyed with a dedicated key derived from `BETTER_AUTH_SECRET` by HKDF-SHA256 (label `shelfmark-demo-source-v1:`), so the secret itself never keys the hash; no raw IP is stored. At most 5 demo users per hash per hour (429 with `Retry-After`), and for IPv6 at most 20 per hour per /48 network (`demo_network_hash`), because one customer usually owns a whole /48 of 65,536 /64s and at most 1000 active demo users (503). Both checks, the user insert and the seed run in one transaction behind one advisory transaction lock (`pg_advisory_xact_lock`), so the limits are exact. The session is created after the commit; if that fails, the user is deleted again. A demo user can hold at most 100 links (409). The per-IP throttler stays as a first, best-effort layer.
5. **Seed.** `src/demo/seed.json` (about 20 real public links, 5 folders with one nested, 8 tags, day offsets for `createdAt` and `lastOpenedAt`), inserted with bulk `createMany` statements. Nothing is fetched.
6. **Cleanup cron.** `GET /api/cron/demo-cleanup` is the only state-changing `GET` (an exception to the rule in ADR 0031, forced by Vercel Cron). It is `@AllowAnonymous()` and listed in `PUBLIC_ROUTES`; a method-level `CronSecretGuard` compares SHA-256 digests of the bearer token and `CRON_SECRET` with `timingSafeEqual` and fails closed (unset or shorter than 32 characters is a 401, like a wrong token). It deletes expired demo users (and demo rows without an expiry older than 24 hours, which the database check should make impossible) in batches of 100 within a 5 second budget, re-checking `is_demo` and the expiry at delete time, and answers `{ deleted, hasMore }` with `no-store`; the cascades remove all owned rows. It logs the count only. `vercel.json` schedules it daily at 03:17 UTC (the Hobby plan allows one run per day).
7. **Migration (expand only).** `users.demo_source_hash` and `users.demo_network_hash` (nullable) and two partial indexes `WHERE is_demo` (by `demo_source_hash, created_at` and by `demo_network_hash, created_at`), written in SQL because Prisma cannot express them. The expiry lookup reuses `users_demo_expires_at_idx` from the models migration.

## Consequences

- Sandboxes outlive their expiry in the database until the next cron run, but are unusable (401). Without `CRON_SECRET` nothing is ever deleted (author step, `docs/SETUP.md` 5.8).
- Demo creation serializes on one lock for the few statements of the transaction; at the 5-per-hour-per-IP rate this is not a bottleneck.
- Per-IP limits on the link preview and add-link routes stay per instance for demo users, as for everyone (ADR 0031 point 5); the 100-link cap bounds the data.
- The IP hash is stable per client and secret: rotating `BETTER_AUTH_SECRET` resets quotas (acceptable). Rows older than the cleanup are gone, so the table never keeps the hashes beyond the sandbox lifetime.
- Clients without a usable address share one `unknown` bucket (`clientIp`), in the throttler and in the Postgres quota: if the address cannot be determined, 5 demo sandboxes per hour exist for all of them together. This only happens without a trusted proxy header and any socket address, which Vercel does not produce.
- The `CronSecretGuard` warns about a missing or short `CRON_SECRET` once per process.
- A CAPTCHA for suspicious activity (5.8) is a follow-up issue.

## Alternatives considered

- **`/api/auth/demo` as a Better Auth endpoint** - would put an anonymous user-creating route on the raw router, outside `ValidationPipe`, `ApiError` and the CSRF guard.
- **Better Auth anonymous plugin** - adds sign-in routes to the allowed surface and ties the demo to its linking model.
- **Rely on the in-memory throttler for the quota** - bypassed by instance spread and cold starts (ADR 0031).
- **Redis or a Postgres rate-limit store now** - a new service or a per-request query for every route; undecided (ADR 0031); the demo only needs one table lookup.
- **Delete expired sandboxes lazily on sign-in** - no guarantee they are ever removed, and puts deletes on a public path.
