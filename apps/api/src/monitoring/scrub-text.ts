const URL_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]}]+/gi;
const EMAIL_PATTERN = /[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]+/g;
const AUTH_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;

/** Replaces URLs (saved links), email addresses and auth tokens inside free text. */
export function scrubText(text: string): string {
  return text
    .replace(URL_PATTERN, '[url]')
    .replace(EMAIL_PATTERN, '[email]')
    .replace(AUTH_PATTERN, '$1 [redacted]');
}
