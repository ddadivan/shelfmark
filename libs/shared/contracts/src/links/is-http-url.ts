const HTTP_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/** True for an absolute http(s) URL with a host. `javascript:`, `data:` and the like are rejected. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return HTTP_PROTOCOLS.includes(url.protocol) && url.hostname !== '';
  } catch {
    return false;
  }
}
