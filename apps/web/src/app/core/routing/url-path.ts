/** The path of a URL without its query string and fragment. */
export function urlPath(url: string): string {
  return url.split(/[?#]/u)[0] ?? '';
}
