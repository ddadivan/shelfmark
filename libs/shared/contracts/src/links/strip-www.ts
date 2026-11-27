/** A host without a leading `www.` (the host is already lower case, as the URL parser reads it). */
export function stripWww(host: string): string {
  return host.replace(/^www\./, '');
}
