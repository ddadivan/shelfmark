import type { IP_FAMILY } from './ip-family.const';

export type IpFamily = (typeof IP_FAMILY)[keyof typeof IP_FAMILY];
