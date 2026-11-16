/** The URL without its `#fragment`: what the duplicate check needs, nothing more. */
export function withoutFragment(url: string): string {
  const hash = url.indexOf('#');
  return hash === -1 ? url : url.slice(0, hash);
}
