import { LINK_FRAMING } from '@shelfmark/contracts';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * How long a cached host verdict stays valid (#553): a site changes its framing headers rarely, so
 * a week; an `unknown` (the page could not be reached) is tried again within the hour.
 */
export const FRAME_CHECK_TTL_MS = {
  [LINK_FRAMING.Allowed]: 7 * DAY_MS,
  [LINK_FRAMING.Blocked]: 7 * DAY_MS,
  [LINK_FRAMING.Unknown]: HOUR_MS,
} as const;
