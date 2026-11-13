/** The path of a router URL, without its query and fragment (`/links?sort=x#a` → `/links`). */
export function urlPath(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}
