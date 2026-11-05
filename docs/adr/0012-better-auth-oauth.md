# 0012. Better Auth with Google and GitHub OAuth

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 5.4, 5.8, 6.1, 6.2, backlog

## Context

Users must sign in to keep private libraries. Stage 1 should avoid password handling (email confirmation, password reset, mail delivery). User data must stay in our database so a later move to an own implementation is possible.

## Decision

- **Sign-in only via Google and GitHub OAuth**, no passwords.
- **Better Auth** with the community NestJS integration `@thallesp/nestjs-better-auth`. Its tables (`User`, `Session`, `Account`, `Verification`) live in our PostgreSQL via Prisma ([0011](0011-postgresql-neon-prisma.md)); routes under `/api/auth/*`.
- **Sessions in cookies**: httpOnly, Secure, SameSite; Origin check; limited session lifetime; sign-out invalidates the session. Tokens are never available to frontend JavaScript.
- **Global guard**: every route is closed except those explicitly marked `@AllowAnonymous()` (justified in the PR and at the use site).
- **Data isolation**: every query on links, folders and tags filters by `userId` of the session; a foreign or missing object returns 404, never 403. Every user-owned resource has an "A cannot see or change B" test.
- **No roles** in stage 1.
- **Demo sign-in**: the server creates a temporary user (`isDemo: true`) with seed data and a 24-hour session; a daily Vercel Cron job deletes expired demo users. Demo users are isolated like real ones; demo creation is strictly rate-limited by IP.
- Web: session read once via Better Auth `getSession`, cached in `AuthStore`; 401 leads to the sign-in screen.

## Consequences

- No password storage, no mail service.
- Web and API on one domain ([0013](0013-vercel-hobby-hosting.md)) let the cookie work without cross-site setup.
- Dependency on a community-maintained Nest integration.
- The Google sign-in screen requires a privacy policy page (5.8).

## Alternatives considered

- **Own implementation (NestJS + Passport + JWT access token + refresh token in an httpOnly cookie)** — in the backlog as a learning task, after stage 1.
- **Email and password** — backlog; needs email confirmation, reset and a mail service.
