import type { IpFamily } from './ip-family.type';

export interface BlockedIpRange {
  family: IpFamily;
  network: string;
  prefix: number;
  /** Why the range is blocked (documentation only). */
  reason: string;
}
