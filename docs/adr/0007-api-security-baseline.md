# 0007. API security baseline

- Status: Accepted
- Date: 2026-11-04
- Source: `docs/PROJECT.md` 5.2, 5.4, 5.7, 5.8

## Context

Security is part of done (PROJECT.md 5.8): Helmet, CSP, HSTS, errors without internal details, validated DTOs, no secrets in logs. Web and API share one Vercel domain (5.7), so the session cookie works without cross-site requests. Secrets live only in platform environment variables; agents never read `.env*`.

## Decision

- **Same origin, no CORS**: the API sends no CORS headers. In development the web dev server proxies `/api` to `http://localhost:3000`.
- **Environment-aware helmet**: production defaults (CSP, HSTS, `upgrade-insecure-requests`); development and test drop HSTS and `upgrade-insecure-requests`. JSON body limit 100 kb.
- **Unified `ApiError`** (`{ statusCode, error, message, requestId }`, in `@shelfmark/contracts`) from a global `AllExceptionsFilter`: no stack traces; **any 5xx returns a generic message**, the cause is logged server-side (method, path, status, request id only, never bodies or personal data). Validation errors are 400 with `message: string[]` (structured `fieldErrors` later, with forms). Body-parser errors map to 400 / 413.
- **Global `ValidationPipe`**: `whitelist`, `forbidNonWhitelisted`, `forbidUnknownValues`, `transform`.
- **Request id**: `X-Request-Id` middleware runs first; an incoming id is accepted only if it matches `^[\w.-]{1,128}$`, otherwise a UUID is generated.
- **Config from `process.env` only**, validated at boot (`PORT`, `NODE_ENV`); no `.env` loading, no `@nestjs/config`. **`NODE_ENV` is fail-safe**: only explicit `development` or `test` is non-production; unset means production. `nx serve` sets `development`.
- **Swagger UI at `/api/docs` is public in every environment**, including production — author decision: portfolio project, the API holds no secrets.
- Deferred to a stage-2 issue: throttling (`@nestjs/throttler`), Logging and Timeout interceptors. `@AllowAnonymous()` is a no-op marker until the global auth guard (stage 2).

## Consequences

- One error shape for the web `errorInterceptor`; the request id links a UI error to a server log line.
- A forgotten `NODE_ENV` yields the strict production headers, never the relaxed ones.
- Exposing a cross-origin client (e.g. a browser extension) would need an explicit CORS decision.
- Public API docs reveal the route list; accepted by the author because the API holds no secrets.

## Alternatives considered

- **CORS for the web origin** — unnecessary on one domain; PROJECT.md 5.8 allows only the own domain anyway.
- **`.env` files with `@nestjs/config`** — conflicts with the no-`.env` rule; the platform injects variables.
- **Swagger only outside production** — rejected by the author (stage 0 plan).
- **Pass 5xx messages through** — leaks internals.
