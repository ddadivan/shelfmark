const HTTP_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/** True for an absolute http(s) URL with a host; mirrors the contract's URL validation. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return HTTP_PROTOCOLS.includes(url.protocol) && url.hostname !== '';
  } catch {
    return false;
  }
}

/** The host without `www.` for display, or the input when it is not a URL. */
export function displayHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

/** The URL without its scheme: the fallback title when no preview could be loaded. */
export function urlWithoutScheme(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
