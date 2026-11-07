import { BlockList, isIP } from 'node:net';
import { BLOCKED_IP_RANGES } from './models/blocked-ip-ranges.const';
import { IP_FAMILY } from './models/ip-family.const';

const IPV6_GROUPS = 8;
const BYTE_MASK = 0xff;
const BYTE_BITS = 8;
const HEX_RADIX = 16;
const IPV4_MAPPED_GROUP = 0xffff;
/** Index of the group that tells mapped (0xffff) from compatible (0) forms. */
const IPV4_MARKER_INDEX = 5;
/** Index of the first of the two groups that hold the embedded IPv4 address. */
const IPV4_TAIL_INDEX = 6;
const IPV4_OCTETS = 4;

const BLOCKED_HOST_NAMES: readonly string[] = ['localhost'];
const BLOCKED_HOST_SUFFIXES: readonly string[] = ['.localhost', '.local', '.internal'];

const blockList = new BlockList();
for (const range of BLOCKED_IP_RANGES) {
  blockList.addSubnet(range.network, range.prefix, range.family);
}

function parseGroups(part: string): number[] | null {
  if (part === '') {
    return [];
  }
  const groups: number[] = [];
  for (const piece of part.split(':')) {
    if (!/^[0-9a-f]{1,4}$/i.test(piece)) {
      return null;
    }
    groups.push(Number.parseInt(piece, HEX_RADIX));
  }
  return groups;
}

/** Expands any valid IPv6 text form to eight 16-bit groups; null when it is not valid. */
export function expandIpv6(address: string): number[] | null {
  let text = address;
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    if (isIP(tail) !== IPV4_OCTETS) {
      return null;
    }
    const [a = 0, b = 0, c = 0, d = 0] = tail.split('.').map(Number);
    const high = ((a << BYTE_BITS) | b).toString(HEX_RADIX);
    const low = ((c << BYTE_BITS) | d).toString(HEX_RADIX);
    text = `${text.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) {
    return null;
  }
  const head = parseGroups(halves[0] ?? '');
  const rest = halves.length === 2 ? parseGroups(halves[1] ?? '') : [];
  if (head === null || rest === null) {
    return null;
  }
  if (halves.length === 1) {
    return head.length === IPV6_GROUPS ? head : null;
  }
  const missing = IPV6_GROUPS - head.length - rest.length;
  if (missing < 1) {
    return null;
  }
  return [...head, ...new Array<number>(missing).fill(0), ...rest];
}

/** The IPv4 address embedded in an IPv4-mapped (::ffff:a.b.c.d) or compatible (::a.b.c.d) form. */
function unwrapIpv4(groups: readonly number[]): string | null {
  const leadingZero = groups.slice(0, IPV4_MARKER_INDEX).every((group) => group === 0);
  const marker = groups[IPV4_MARKER_INDEX];
  if (!leadingZero || (marker !== 0 && marker !== IPV4_MAPPED_GROUP)) {
    return null;
  }
  const high = groups[IPV4_TAIL_INDEX] ?? 0;
  const low = groups[IPV4_TAIL_INDEX + 1] ?? 0;
  return [high >> BYTE_BITS, high & BYTE_MASK, low >> BYTE_BITS, low & BYTE_MASK].join('.');
}

/**
 * True when the fetcher must not connect to the address. Fails closed: anything that is not a
 * canonical IPv4 / IPv6 literal (decimal, octal, hex or short forms, zone ids, garbage) is blocked.
 */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === IPV4_OCTETS) {
    return blockList.check(address, IP_FAMILY.V4);
  }
  if (family !== 0 && !address.includes('%')) {
    const groups = expandIpv6(address);
    if (groups === null) {
      return true;
    }
    const embedded = unwrapIpv4(groups);
    if (embedded !== null) {
      return blockList.check(embedded, IP_FAMILY.V4);
    }
    return blockList.check(
      groups.map((group) => group.toString(HEX_RADIX)).join(':'),
      IP_FAMILY.V6,
    );
  }
  return true;
}

/** True for names that are local by convention and never resolve to a public address. */
export function isBlockedHostname(hostname: string): boolean {
  const name = hostname.toLowerCase().replace(/\.$/, '');
  return (
    BLOCKED_HOST_NAMES.includes(name) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => name.endsWith(suffix))
  );
}
