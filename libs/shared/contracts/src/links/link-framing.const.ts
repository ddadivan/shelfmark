/**
 * Whether a link's page may be shown inside Shelfmark's preview frame (#553, ADR 0059):
 * `allowed` — no `X-Frame-Options` and no CSP `frame-ancestors` that refuse another site;
 * `blocked` — the site refuses framing (or the address is not https, which a https page cannot
 * frame); `unknown` — the check could not reach the page (the web then tries the frame with a
 * load timeout).
 */
export const LINK_FRAMING = { Allowed: 'allowed', Blocked: 'blocked', Unknown: 'unknown' } as const;
