import type { BlockedIpRange } from './blocked-ip-range.interface';
import { IP_FAMILY } from './ip-family.const';

const V4 = IP_FAMILY.V4;
const V6 = IP_FAMILY.V6;

/**
 * Every range the fetcher refuses to connect to. IPv4-mapped / compatible IPv6 addresses are
 * unwrapped to IPv4 before the lookup, so they are covered by the IPv4 rows.
 */
export const BLOCKED_IP_RANGES: readonly BlockedIpRange[] = [
  { family: V4, network: '0.0.0.0', prefix: 8, reason: 'unspecified / this network' },
  { family: V4, network: '10.0.0.0', prefix: 8, reason: 'private' },
  { family: V4, network: '100.64.0.0', prefix: 10, reason: 'carrier-grade NAT' },
  { family: V4, network: '127.0.0.0', prefix: 8, reason: 'loopback' },
  {
    family: V4,
    network: '169.254.0.0',
    prefix: 16,
    reason: 'link-local, cloud metadata 169.254.169.254',
  },
  { family: V4, network: '172.16.0.0', prefix: 12, reason: 'private' },
  { family: V4, network: '192.0.0.0', prefix: 24, reason: 'IETF protocol assignments' },
  { family: V4, network: '192.0.2.0', prefix: 24, reason: 'documentation' },
  { family: V4, network: '192.88.99.0', prefix: 24, reason: '6to4 relay anycast' },
  { family: V4, network: '192.168.0.0', prefix: 16, reason: 'private' },
  { family: V4, network: '198.18.0.0', prefix: 15, reason: 'benchmarking' },
  { family: V4, network: '198.51.100.0', prefix: 24, reason: 'documentation' },
  { family: V4, network: '203.0.113.0', prefix: 24, reason: 'documentation' },
  { family: V4, network: '224.0.0.0', prefix: 4, reason: 'multicast' },
  { family: V4, network: '240.0.0.0', prefix: 4, reason: 'reserved, broadcast' },
  { family: V6, network: '::', prefix: 128, reason: 'unspecified' },
  { family: V6, network: '::1', prefix: 128, reason: 'loopback' },
  { family: V6, network: '64:ff9b::', prefix: 96, reason: 'NAT64, can reach IPv4 internals' },
  { family: V6, network: '64:ff9b:1::', prefix: 48, reason: 'local-use NAT64' },
  { family: V6, network: '100::', prefix: 64, reason: 'discard-only' },
  { family: V6, network: '2001::', prefix: 23, reason: 'Teredo and IETF protocol assignments' },
  { family: V6, network: '2001:db8::', prefix: 32, reason: 'documentation' },
  { family: V6, network: '2002::', prefix: 16, reason: '6to4, embeds IPv4' },
  {
    family: V6,
    network: 'fc00::',
    prefix: 7,
    reason: 'unique local, cloud metadata fd00:ec2::254',
  },
  { family: V6, network: 'fe80::', prefix: 10, reason: 'link-local' },
  { family: V6, network: 'fec0::', prefix: 10, reason: 'deprecated site-local' },
  { family: V6, network: 'ff00::', prefix: 8, reason: 'multicast' },
];
