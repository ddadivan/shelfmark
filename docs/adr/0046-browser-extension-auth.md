# 0046. Browser extension auth: the session cookie, extension origins trusted in CsrfGuard only

- Status: Accepted
- Date: 2026-11-16
- Source: issue #445 (Chrome MV3 extension that saves the current tab), `docs/PROJECT.md` 5.8, ADR 0007 (no CORS)

## Context

- The extension popup (origin `chrome-extension://<id>`) has host permission for the Shelfmark origin and calls the API with `fetch(..., { credentials: 'include' })`.
- Chrome treats such requests as same-site, so the existing Better Auth session cookie (httpOnly, SameSite=Lax) is sent. CORS does not apply to extension pages with host permission.
- `CsrfGuard` rejects any `Origin` that is not the app's, and the browser sets `Origin: chrome-extension://<id>`. The `Sec-Fetch-Site` value of these requests is not documented, so it cannot be relied on.

## Decision

1. **The extension reuses the session cookie.** No token, no API key, no second sign-in. It calls `GET /api/auth/get-session`, folders, tags, rules, `POST /api/links` and the new `POST /api/links/lookup`.
2. **Its origins are trusted in `CsrfGuard` only.** `EXTENSION_ORIGINS` is a comma-separated list of `chrome-extension://<id>` (id: exactly 32 letters a to p), read and validated at boot (a bad entry or a wildcard fails boot; the error names the variable, never the value). In production unset or empty trusts no extension. Outside production any well-formed extension origin is accepted, so an unpacked dev build works without setup. A trusted extension origin skips the Origin and `Sec-Fetch-Site` checks; the JSON content-type rule still applies. Any other `chrome-extension://` origin is a 403.
3. **Not in Better Auth's `trustedOrigins`.** The extension never calls a state-changing `/api/auth` route, so sign-in, sign-out and OAuth callbacks stay web-only.
4. **No CORS headers.** ADR 0007 stands.
5. **Lookup without fetching.** `POST /api/links/lookup` answers the user's own live link for a URL from the database only, so opening the popup never causes outbound requests.

## Alternatives

- **Bearer token** issued to the extension: needs a token store, issuing, rotation and revocation UI, and a second auth path in the session guard.
- **API keys** per user: the same cost, plus a secret the user must paste and protect.
- **CORS with credentials** for the extension origin: not needed with host permission, and it would open the API to browser pages.

## Consequences

- The extension id is stable only for a published or key-pinned build; the author sets the production id in `EXTENSION_ORIGINS` in Vercel.
- Anyone who can run code inside a trusted extension acts as the signed-in user, as with any same-site script; the allow-list keeps other extensions out in production.
- Outside production every extension can call the API with the user's cookie, which is acceptable for local development only.
