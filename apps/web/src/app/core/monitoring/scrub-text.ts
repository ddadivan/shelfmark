const PATH = `[^\\s"'<>)\\]}]*`;
const URL_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]}]+/gi;
// Top-level domains that are not usual property names: a bare `name.com` is a host.
const STRONG_TLDS = 'com|org|net|edu|gov|info|biz|xyz|online|local|internal|lan|example';
// Other TLDs (`to`, `it`, `is`, `app`, `dev`, `io`, ...) are also property names in code
// (`foo.to`, `Object.is`), so they only count as a host with a port or a path.
const OTHER_TLDS =
  'io|dev|app|co|me|ai|ly|tv|cc|fm|gg|sh|so|to|us|uk|de|fr|es|it|nl|se|no|fi|pl|cz|ch|at|be|ru|ua|by|kz|cn|jp|kr|in|br|ar|mx|au|nz|ca|eu|site|tech|test|localhost|is|am|im|id|my';
const WWW_HOST = new RegExp(`\\bwww\\.[a-z0-9.-]+(?::\\d+)?(?:[/?#]${PATH})?`, 'gi');
const STRONG_HOST = new RegExp(
  `\\b(?:[a-z0-9-]+\\.)+(?:${STRONG_TLDS})\\b(?::\\d+)?(?:[/?#]${PATH})?`,
  'gi',
);
const OTHER_HOST = new RegExp(
  `\\b(?:[a-z0-9-]+\\.)+(?:${OTHER_TLDS})\\b(?::\\d+(?:/${PATH})?|/${PATH})`,
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
    .replace(WWW_HOST, '[url]')
    .replace(STRONG_HOST, '[url]')
    .replace(OTHER_HOST, '[url]')
    .replace(IPV4_PATTERN, '[url]')
    .replace(AUTH_PATTERN, '$1 [redacted]');
}
