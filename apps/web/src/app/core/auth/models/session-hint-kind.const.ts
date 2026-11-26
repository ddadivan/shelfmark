/**
 * What `STORAGE_KEY.SessionHint` holds: `1` for a session (or an OAuth redirect on its way), `demo`
 * while the session is a demo (#440), so `public/boot-skeleton.js` can draw the demo banner in the
 * app skeleton from the first paint. Same values as `DEMO_HINT` in that script.
 */
export const SESSION_HINT_KIND = { Session: '1', Demo: 'demo' } as const;
