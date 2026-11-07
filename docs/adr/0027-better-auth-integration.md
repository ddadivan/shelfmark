# 0027. Better Auth integration: configuration, hardening and test harness

- Status: Proposed
- Date: 2026-11-07
- Source: issue #64; `docs/PROJECT.md` 5.4, 5.8; implements [0012](0012-better-auth-oauth.md); builds on [0007](0007-api-security-baseline.md), [0019](0019-vercel-deployment-architecture.md), [0020](0020-npm-install-scripts-policy.md), [0024](0024-named-constants-as-const.md) and [0025](0025-database-tooling-prisma-7-pglite.md)

## Context

ADR 0012 chose Better Auth with Google and GitHub and the community Nest integration. Issue #64 wires it in. Better Auth ships many endpoints and options Shelfmark does not need, the integration enables CORS by default, and several protections silently switch off in a test environment. This ADR records the settings that matter for security and operations so a later change has to argue with them.

## Decision

**Versions (exact pins).** `better-auth` 1.7.18, `@thallesp/nestjs-better-auth` 2.8.0 (supports Nest 12), and `express` 5.3.0 as a direct dependency (the integration requires it by name at runtime; same reason as `swagger-ui-dist`). The two Better Auth packages are ESM-only and stay external bare imports (`EsmExternalsPlugin` emits them as static ESM imports). None declares an install script, so `allowScripts` (ADR 0020) does not change. `api/index.mjs` imports `@thallesp/nestjs-better-auth`, `better-auth`, `better-auth/adapters/prisma`, `better-auth/api`, `better-auth/node` and `express` so the Vercel tracer ships them.

**Environment (strictly environment-driven, read once at boot, errors name the variable and never the value).**

| Name | Rule |
| --- | --- |
| `BETTER_AUTH_SECRET` | Always required, at least 32 characters, never Better Auth's placeholder secret. One value per environment. |
| `BETTER_AUTH_URL` | Required in production, previews included (no `VERCEL_BRANCH_URL` fallback). An origin only; `https:` in production. Defaults to `http://localhost:4200` outside production. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Optional, comma-separated exact origins, no wildcards or paths. The base URL origin is always trusted. |
| `GOOGLE_CLIENT_ID` / `_SECRET`, `GITHUB_CLIENT_ID` / `_SECRET` | Both or neither; a missing pair means the provider is not registered and a warning names the variables. |
| `TEST` | Must not be set in production (see below). |

**Integration.**

- `AuthModule.forRootAsync` with `disableTrustedOriginsCors: true` (the API is same-origin, ADR 0007; the integration would otherwise call `enableCors`), the integration's body parsers off (our global 100 kb JSON parser and its 400/413 mapping stay in front), `disableGlobalAuthGuard: true` (the global guard and `userId` from the session come with #65). `disableControllers` is not used: despite its name it also removes the middleware that mounts the router.
- `/api/auth/*` is the raw Better Auth Node handler. Its responses get the request id and helmet headers but bypass `ValidationPipe` and `AllExceptionsFilter`: auth errors keep Better Auth's `{ code, message }` shape, not `ApiError`.
- `createAuth(prisma, config)` is a factory, never a module-level singleton, so tests inject the in-memory database.

**Hardening.**

- **Allowed surface.** Only `/sign-in/social`, `/callback/:id`, `/get-session` and `/sign-out` are served. Every other route in the 1.7.18 router (email and password, profile and email changes, password reset, verification mail, session and account management, token refresh, `/ok`, `/error`) is in `disabledPaths` and returns 404. This is also what keeps `isDemo` unreachable: `user.additionalFields.isDemo` has `input: false`, and `update-user` and `sign-up/email` are off. `disabledPaths` matches exact paths, so the parameterised `/reset-password/:token` cannot be listed; it is inert because no `sendResetPassword` is configured.
- **Sessions and cookies.** 7-day sessions with a 1-day sliding refresh, no cookie cache (sign-out and revocation apply on the next request). Cookies are HttpOnly, `SameSite=Lax`, `Path=/`, prefix `shelfmark`; `advanced.useSecureCookies` follows `isProduction` explicitly (not inferred from the URL), which adds `Secure` and the `__Secure-` prefix. **Lax, not Strict:** the OAuth callback is a top-level cross-site GET from the provider, and Strict would drop the state cookie and break sign-in.
- **CSRF and redirects.** Better Auth's own checks stay on and nothing opts out (`disableCSRFCheck`, `disableOriginCheck`, `skipStateCookieCheck` are never set): Origin check on cookie-bearing state-changing requests, OAuth `state` in the `verifications` table plus PKCE, and `callbackURL` / `errorCallbackURL` validated against the trusted origins. Better Auth skips the origin and CSRF checks when `NODE_ENV` is `test` (read once at import) or `TEST` is truthy, so `readAuthConfig` refuses a set `TEST` in production and the specs run as `NODE_ENV=development` without `TEST` (`apps/api/vitest.setup.ts`).
- **No provider tokens at rest.** Stage 1 never calls the provider APIs after sign-in, so `databaseHooks.account.create|update.before` null the access, refresh and ID tokens and their expiry fields. This replaces the "encrypt OAuth tokens or do not store them" note of ADR 0025: we do not store them. If a feature ever needs them, add encryption (`account.encryptOAuthTokens`) first.
- **Filtered session response.** An `after` hook on `/get-session` maps HTTP responses to `AuthSessionResponse` (`user: { id, name, email, image, isDemo }`, `session: { expiresAt }`). The session token, IP address and user agent never reach JavaScript. Server-side `auth.api.getSession` calls (the guard of #65) are not filtered.
- **Account linking** is Better Auth's default: a second provider with the same email links to the existing user only when the provider reports the email as verified. An unverified GitHub email does not link and creates no session.
- **IP and user agent** are stored on the session (Better Auth default). `advanced.ipAddress.disableIpTracking` is not used: it makes `getIP` return `null`, and the rate limiter then skips every request (`resolveRateLimitConfig` returns `null`), so disabling tracking would also disable per-IP rate limiting.
- **Logging.** Better Auth's logger is adapted onto the Nest `Logger` with level and message only (control characters stripped, length capped); the extra arguments (provider responses, tokens) are dropped. `onAPIError.onError` is set too, because without it Better Auth prints `error.message` through its own console logger outside the adapter; the handler logs status and message of Better Auth's errors and only the class name of anything else. A spec captures stdout, stderr and the console across all flows, including a failing token endpoint, and asserts that no secret, code, provider token, state or session token appears and that Better Auth's own console output stays silent.
- **Rate limiting.** Better Auth's built-in limiter (in memory, per instance, enabled only when its captured `NODE_ENV` is `production`) stays on until `@nestjs/throttler` lands.
- `telemetry: { enabled: false }`; `advanced.database.generateId: false` (Prisma's `uuid(7)` default applies).

**Previews.** Previews run with `NODE_ENV=production`, so they need their own `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Without provider variables OAuth is simply unavailable there and `/api/health`, `/api/docs` and `GET /api/auth/get-session` (`null`) still work. Whether and how OAuth works on previews is decided separately (ADR 0026, Proposed); nothing here depends on it.

**Test harness** (reused by #65): `stubOAuthProviders` fakes the GitHub and Google endpoints on `globalThis.fetch` (any other URL throws, so no network), `createAuthTestApp` boots `AppModule` on an in-memory PGlite with per-run random secrets, and `signInAs(app, baseUrl, { email, name, provider })` returns `{ userId, cookie }` by driving the real flow. Two calls give the two users a data-isolation test needs.

## Consequences

- Auth routes return `{ code, message }`, which the web `errorInterceptor` must treat as a separate shape for `/api/auth/*`.
- GitHub users without a verified email cannot sign in (Better Auth answers `email_not_found`); the web shows it as the OAuth failure reason.
- The community integration has had breaking 2.x minors and enables CORS by default; the exact pin and the no-CORS spec guard both.
- `better-auth` 1.7.18 is days old (no cooldown policy); Dependabot tracks it.
- The web binding (a small `HttpClient`-based client for the three endpoints in `@shelfmark/contracts`) is a separate follow-up, not part of #64.

## Alternatives considered

- **Own thin integration** (a Nest middleware around `toNodeHandler(auth)` plus a guard on `auth.api.getSession`): about 60 lines, kept as the fallback if the community package breaks.
- **`SameSite=Strict`**: breaks the OAuth callback.
- **Encrypting provider tokens**: needless while nothing reads them; stripping leaves nothing to protect.
- **`VERCEL_BRANCH_URL` as the preview base URL**: rejected by the author (strictly environment-driven).
