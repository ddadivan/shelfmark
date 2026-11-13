/** A router URL without its fragment (`/links?sort=x#a` → `/links?sort=x`). */
export function urlWithoutFragment(url: string): string {
  const end = url.indexOf('#');
  return end === -1 ? url : url.slice(0, end);
}
