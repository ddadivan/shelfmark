/**
 * The host of a URL as the URL parser reads it: lower case, IDN as punycode, one trailing dot
 * dropped; `null` when the text is not a URL. Shared by the link kind (ADR 0038) and the domain
 * rules (#398).
 */
export function linkHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
}
