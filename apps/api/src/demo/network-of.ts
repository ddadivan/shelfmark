const GROUPS = 8;
const PREFIX_GROUPS = 3;

/**
 * The /48 network of a rate-limit client key, or `null` for an IPv4 client. IPv6 keys arrive as
 * their /64 (`2001:db8:1:2::/64`, see `clientIp`); the first three groups are the /48. A single
 * household or hosting customer usually owns a /48, so counting it too stops an attacker who
 * walks through the 65,536 /64s inside it.
 */
export function networkOf(sourceKey: string): string | null {
  if (!sourceKey.endsWith('/64')) return null;
  const address = sourceKey.slice(0, -'/64'.length);
  const [head = '', tail = ''] = address.split('::');
  const groups = (part: string): string[] => (part === '' ? [] : part.split(':'));
  const expanded = [...groups(head), ...Array<string>(GROUPS).fill('0'), ...groups(tail)];
  const prefix = expanded
    .slice(0, PREFIX_GROUPS)
    .map((group) => group.toLowerCase().replace(/^0+(?=.)/, ''));
  return `${prefix.join(':')}::/48`;
}
