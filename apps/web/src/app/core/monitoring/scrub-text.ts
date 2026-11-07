const URL_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]}]+/gi;
// Bare hosts such as `example.com/page?x=1` or `www.example.org`, and IPv4 addresses.
const TLDS =
  'com|org|net|io|dev|app|co|me|info|edu|gov|biz|xyz|online|site|tech|ai|ly|tv|cc|fm|gg|sh|so|to|us|uk|de|fr|es|it|nl|se|no|fi|pl|cz|ch|at|be|ru|ua|by|kz|cn|jp|kr|in|br|ar|mx|au|nz|ca|eu|local|internal|lan|test|example|localhost';
const HOST_PATTERN = new RegExp(
  `\\b(?:www\\.|(?:[a-z0-9-]+\\.)+(?:${TLDS})\\b)[a-z0-9.-]*(?::\\d+)?(?:[/?#][^\\s"'<>)\\]}]*)?`,
  'gi',
);
const IPV4_PATTERN = /\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/[^\s"'<>)\]}]*)?/g;
const EMAIL_PATTERN = /[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]+/g;
const AUTH_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;

/** Replaces URLs (saved links), bare hosts, IPs, email addresses and auth tokens inside free text. */
export function scrubText(text: string): string {
  return text
    .replace(URL_PATTERN, '[url]')
    .replace(EMAIL_PATTERN, '[email]')
    .replace(HOST_PATTERN, '[url]')
    .replace(IPV4_PATTERN, '[url]')
    .replace(AUTH_PATTERN, '$1 [redacted]');
}
