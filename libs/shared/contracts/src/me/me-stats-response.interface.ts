import type { ConnectedAccount } from './connected-account.interface';
import type { MeStatsSite } from './me-stats-site.interface';
import type { MeStatsTag } from './me-stats-tag.interface';
import type { MeStatsWeek } from './me-stats-week.interface';

/**
 * `GET /api/me/stats` (#352): the "Your shelf" card and the connected accounts of the Account
 * page. Counted for the signed-in user only; links and folders in Trash are left out.
 */
export interface MeStatsResponse {
  linkCount: number;
  folderCount: number;
  tagCount: number;
  /** At most `ME_STATS_LIMIT.TopSites`, most links first, then by host. */
  topSites: MeStatsSite[];
  /** At most `ME_STATS_LIMIT.TopTags` tags used on at least one live link, most first, then by name. */
  topTags: MeStatsTag[];
  /** Exactly `ME_STATS_LIMIT.Weeks` weeks, oldest first, the current week last (zeros included). */
  weeklyLinks: MeStatsWeek[];
  /** ISO time the account was created. */
  memberSince: string;
  /** ISO creation time of the oldest live link, `null` without links. */
  oldestLinkAt: string | null;
  /** Oldest first. A demo account has none. */
  connectedAccounts: ConnectedAccount[];
}
