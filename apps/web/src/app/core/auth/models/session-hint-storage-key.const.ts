/**
 * `localStorage` key that tells the next page load that this device probably has a session, so
 * `public/boot-skeleton.js` can show the app skeleton from the first paint (#410). A hint only:
 * the session request decides. Same value as `HINT_KEY` in that script.
 */
export const SESSION_HINT_STORAGE_KEY = 'sm-session-hint';
