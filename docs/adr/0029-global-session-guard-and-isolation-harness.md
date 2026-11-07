# 0029. Global session guard, public-route allow-list and data-isolation harness

- Status: Proposed
- Date: 2026-11-07
- Source: issue #65; `docs/PROJECT.md` 5.2, 5.4, 5.8, 6.2; builds on [0007](0007-api-security-baseline.md), [0024](0024-named-constants-as-const.md) and [0030](0030-better-auth-integration.md)

## Context

From stage 2 every Nest route must need a session, handlers must take the owner of data from that session, and a reusable test must prove that user B never sees user A's data. The community integration (`@thallesp/nestjs-better-auth` 2.8.0) ships a global `AuthGuard`; reading its code showed:

- It always calls `auth.api.getSession` before it reads the `PUBLIC` key, so a public route that receives a cookie still queries the database.
- It does not catch errors from `getSession`. A Better Auth `APIError` has a string `status` and a numeric `statusCode`; our filter answered 500 for it.
- Server-side `getSession` refreshes the session inside the `updateAge` window and writes `expiresAt`, but sets the new cookie on a response the guard throws away, so DB and cookie drift apart.
- It puts the raw session (including `session.token`, IP and user agent) and an untyped `user` on the request.
- Better Auth's router and Swagger are mounted on the HTTP adapter, so no Nest guard ever runs on `/api/auth/*` or `/api/docs`.

## Decision

- **Own thin `SessionAuthGuard`** (`src/auth/session-auth.guard.ts`, registered as `APP_GUARD` in `AuthModule`) on the integration's `AuthService`; `disableGlobalAuthGuard: true` stays. ADR 0030 named this as the fallback.
  1. The public check comes first and reads `PUBLIC` from the **handler only**, so a class-level `@AllowAnonymous()` fails closed (the scanner also reports it). No session lookup for public routes.
  2. Otherwise `getSession` with `query: { disableRefresh: true }`. The guard is read-only; the sliding refresh happens only through `GET /api/auth/get-session`, which sets the cookie properly. A user who only calls other API routes is signed out after 7 days.
  3. The result goes through `toAuthSessionResponse` (fail closed) into `request.auth`; no session means `UnauthorizedException`.
  4. A Better Auth error with status 400, 401 or 403 is a 401. A 429 (a throttled lookup) is a 503, so it does not sign the user out. Anything else (a database outage, another 4xx) is rethrown, and the error filter answers with that status or a generic 500, because the web signs the user out on 401.
  5. **Registration and order.** The guard is registered as `APP_GUARD` explicitly in `AppModule` (not in `AuthModule`), in one visible provider list. Global guards run in registration order, so the throttler of #123 must be registered before it: a flood is then rejected before any session lookup.
- **`@CurrentUser()`** returns the contract `AuthUser` (`id, name, email, image, isDemo`) from `request.auth`, and throws 401 when it is missing. Handlers use `user.id`, never a `userId` from body, params or query. `isDemo` is part of the user; demo write restrictions are a later issue.
- **Error filter:** uses whichever of `status` / `statusCode` is a number, so a stray `APIError` keeps its 4xx.
- **Allow-list and scanner.** `@AllowAnonymous()` stays the integration's decorator (key `PUBLIC`). `PUBLIC_ROUTES` lists the only public Nest routes (today `GET /api/health`) with a reason. `route-protection.spec.ts` discovers every route and fails when the public set differs from the list, when a controller class is public, when anything is `OPTIONAL`, or when a public route reads `@CurrentUser()`. The scan handles array paths (cross product of controller and handler paths), throws on `@All()`, and a second check reads the real Express router stack to prove no reachable Nest route is missing from the scan; negative tests with throwaway controllers prove every violation kind is detected. A behavioural sweep proves every guarded route answers 401 without a cookie, with a forged cookie and after sign-out, and that a public route never looks the session up.
- **ESLint** restricts `@thallesp/nestjs-better-auth` to `src/auth/**` and `src/common/auth/**`, which blocks the untyped `Session`, `OptionalAuth`, `Public` and `Roles` in feature modules.
- **Data-isolation harness** (`apps/api/test-utils`): `createIsolationUsers(t)` signs in `owner` and `intruder`, `asUser` / `anonymous` build supertest agents, `expectIsolated(app, users, scenario)` runs the checks of PROJECT.md 5.8: anonymous 401; the intruder's read, update, remove and reference are a bare 404 `ApiError` that looks exactly like the same call on a random id; the intruder's list is a 200 without the id; anonymous calls to every provided operation are a bare 401; the owner's resource is unchanged afterwards and listed. `update`, `remove`, `list` and `reference` must be provided or skipped with a reason, and `missingId()` defaults to a UUIDv7-shaped id so a future v7-only id pipe cannot make foreign and missing ids differ. Fixtures (`NotesFixtureModule`, `LeakyNotesFixtureModule`) are imported only through `createAuthTestApp({ imports })`, never into `AppModule`; the leaky one proves each assertion can fail.
- **Not here:** throttler and Logging/Timeout interceptors (#123, before #72), `GET /api/me`, an Origin check on unsafe methods of non-auth routes.

## Consequences

- One session query (no cookie cache, on purpose: sign-out applies at once) per guarded request on Neon.
- Sliding expiry depends on the web calling `get-session` (#66).
- CSRF on Nest routes relies on `SameSite=Lax` and JSON bodies; Better Auth's Origin check covers only `/api/auth/*`. Therefore no state-changing `GET`, because Lax cookies ride along on top-level cross-site GETs. An Origin check for unsafe methods on `/api` is left to the author.
- Until the Origin / Content-Type check lands (proposed in #123, author decision E), no bodyless state-changing routes ship.
- A new public route needs a reviewed change in `PUBLIC_ROUTES`, a comment at the use site and a PR justification.
- #72, #75 and #76 must add an `expectIsolated` test for their resources.

## Alternatives considered

- **The integration's `AuthGuard` as is:** DB call on public routes, 500 on `APIError`, refresh write with a lost cookie, token on the request, untyped user.
- **Subclassing it:** relies on inherited constructor metadata through a private, unexported options token.
- **Own `@AllowAnonymous` key:** a second marker next to the integration's own; the existing key is already honoured and the scanner covers misuse.
