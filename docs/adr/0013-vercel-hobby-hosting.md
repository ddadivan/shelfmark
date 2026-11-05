# 0013. Vercel Hobby hosting

- Status: Accepted
- Date: 2026-11-05
- Source: `docs/PROJECT.md` 5, 5.7, 5.8, 9.5

## Context

Stage 1 must be publicly reachable and free. Web and API should share one domain so the session cookie works without cross-domain issues ([0012](0012-better-auth-oauth.md)). Every PR should be reviewable on a live preview.

## Decision

- **Vercel (Hobby)** hosts both parts on one `*.vercel.app` domain:
  - Angular — static files (CSR, [0005](0005-web-csr-zoneless-angular.md));
  - NestJS — **one Vercel Function** (zero-config), reached under `/api`.
- **Git integration**: push to `main` → production; every PR → preview deployment. Previews use a separate Neon branch ([0011](0011-postgresql-neon-prisma.md)).
- **Secrets** only in Vercel environment variables, entered by the author.
- **Extras**: Vercel Cron (daily cleanup of expired demo sandboxes), Vercel logs and analytics; Sentry free tier for errors.
- **Pending (deploy task)**: exact Nx monorepo configuration for Vercel (rewrites `/api` → function), the function handler built on `createApp()` ([0006](0006-api-nestjs-build-and-tests.md)), ESM output form, Swagger UI assets, `NODE_ENV=production` and the CSP header.

## Consequences

- No hosting cost; preview links for every PR; one origin, so no CORS ([0007](0007-api-security-baseline.md)).
- Hobby limits: non-commercial use only; function size ≤ 250 MB.
- Plan B for a commercial product: Google Cloud Run or paid Render without changing NestJS code.

## Alternatives considered

- **Google Cloud Run / paid Render** — the plan B if the product becomes commercial; not free for stage 1.
