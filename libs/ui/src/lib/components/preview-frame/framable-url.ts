/**
 * The normalised URL of `value` when it may be shown in a `ui-preview-frame`, else `null`.
 * Accepted: an absolute `https:` URL with a host and no username or password, and (when
 * `ownOrigin` is given) not on that origin (a same-origin page in a frame that has both
 * `allow-scripts` and `allow-same-origin` could remove its own sandbox). Everything else is
 * refused: `http:`, `javascript:`, `data:`, `blob:`, `about:`, `file:`, relative URLs, garbage.
 */
export function framableUrl(value: string, ownOrigin?: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname === '' ||
    url.username !== '' ||
    url.password !== '' ||
    (ownOrigin !== undefined && url.origin === ownOrigin)
  ) {
    return null;
  }
  return url.href;
}

/** `true` when `framableUrl(value, ownOrigin)` accepts it. */
export function isFramableUrl(value: string, ownOrigin?: string): boolean {
  return framableUrl(value, ownOrigin) !== null;
}
