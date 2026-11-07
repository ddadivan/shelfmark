// eslint-disable-next-line no-control-regex -- control characters are exactly what is rejected
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const PROBE_ORIGIN = 'http://app.invalid';

/**
 * Returns `value` when it is a path inside this app, otherwise `null`. Rejects everything that
 * could leave the origin after sign-in: `//host`, `/\host`, schemes, backslashes, control
 * characters. Use it on every `returnUrl` read from the address bar.
 */
export function safeReturnUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  if (value.includes('\\') || CONTROL_CHARACTERS.test(value)) {
    return null;
  }
  try {
    return new URL(value, PROBE_ORIGIN).origin === PROBE_ORIGIN ? value : null;
  } catch {
    return null;
  }
}
