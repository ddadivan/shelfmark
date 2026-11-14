/** `http://` or `https://` at the start, in any case. */
const HTTP_SCHEME = /^https?:\/\//i;

/** Any URI scheme (`mailto:`, `javascript:`, `ftp:` ...): letters first, then letters, digits, `+ . -`. */
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** A host followed by a port (`example.com:8080`, `localhost:3000/x`): the colon is not a scheme. */
const HOST_WITH_PORT = /^[^\s/?#:@]+:\d{1,5}(?:[/?#]|$)/;

/**
 * A domain name: dotted labels of letters (any script, so IDN works), digits, `-` and `_`, ending in
 * a letter-only top-level label of two or more letters or a punycode one (`xn--p1ai`). One trailing
 * dot is allowed.
 */
const DOMAIN =
  /^(?:[\p{L}\p{N}_](?:[\p{L}\p{N}_-]*[\p{L}\p{N}_])?\.)+(?:\p{L}{2,}|xn--[a-z0-9-]+)\.?$/iu;

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** A bracketed IPv6 address (`[::1]`); the URL parser checks the inside. */
const IPV6 = /^\[[0-9a-f:.]+\]$/i;

const LOCALHOST = /^localhost$/i;

/** The host of a scheme-less address: up to the first `/ ? #`, without a `:port`. */
function hostOf(address: string): string {
  const end = address.search(/[/?#]/);
  const authority = end === -1 ? address : address.slice(0, end);
  return authority.replace(/:\d{1,5}$/, '');
}

function looksLikeHost(host: string): boolean {
  return DOMAIN.test(host) || IPV4.test(host) || IPV6.test(host) || LOCALHOST.test(host);
}

/**
 * A link as typed or pasted, ready for validation (#405): trimmed, with `https://` added when it
 * has no scheme and starts with a host (`example.com`, `www.example.com/path?x=1`,
 * `sub.example.co.uk`, `bücher.de`, `localhost:3000`) or with `//`. An `http://` or `https://`
 * address is kept as typed (any case). Another scheme (`javascript:`, `data:`, `mailto:`,
 * `ftp:`, `file:` ...) and anything that does not look like a host (spaces, no dot, an `@`) come
 * back only trimmed, so the http(s) validation still rejects them.
 *
 * Not a sanitizer: it never makes a URL safe; `isHttpUrl`, the API's `IsHttpUrl` and the SSRF guard
 * still decide. Pure; shared by the web app (Add link, Paste many, share target) and the API DTOs.
 */
export function withDefaultScheme(input: string): string {
  const value = input.trim();
  if (value === '' || HTTP_SCHEME.test(value) || /\s/.test(value)) {
    return value;
  }
  if (value.startsWith('//')) {
    return looksLikeHost(hostOf(value.slice(2))) ? `https:${value}` : value;
  }
  if (ANY_SCHEME.test(value) && !HOST_WITH_PORT.test(value)) {
    return value;
  }
  return looksLikeHost(hostOf(value)) ? `https://${value}` : value;
}
