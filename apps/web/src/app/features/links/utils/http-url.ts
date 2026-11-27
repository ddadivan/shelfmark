/** The URL without its scheme: the fallback title when no preview could be loaded. */
export function urlWithoutScheme(value: string): string {
  return value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
