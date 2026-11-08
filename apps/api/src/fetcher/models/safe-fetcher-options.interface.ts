import type { AddressPolicy } from './address-policy.type';
import type { DnsResolver } from './dns-resolver.type';
import type { FetchLimits } from './fetch-limits.interface';

/** Overrides for tests. Production uses the defaults: system DNS, the blocked ranges, ports 80 and 443. */
export interface SafeFetcherOptions {
  resolve?: DnsResolver;
  isAddressAllowed?: AddressPolicy;
  allowedPorts?: readonly number[];
  limits?: Partial<FetchLimits>;
}
