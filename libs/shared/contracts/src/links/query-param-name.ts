/** The decoded, lower-case name of one `name=value` query segment (`%75tm_x=1` gives `utm_x`). */
export function queryParamName(segment: string): string {
  const raw = segment.split('=')[0] ?? '';
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' ')).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}
