export { isHttpUrl } from '@shelfmark/contracts';

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
