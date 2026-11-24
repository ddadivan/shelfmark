import type { LinkResponse } from '@shelfmark/contracts';

/** The lists of the Today page that it loads itself (the reminders and Rediscover have stores). */
export interface TodayState {
  /** Links saved in the last 7 days (`GET /api/links?saved=week`), newest first, one page. */
  week: LinkResponse[];
  /** More than one page was saved this week: the count reads "100+". */
  weekMore: boolean;
  weekLoaded: boolean;
  weekFailed: boolean;
  /** The newest links of the whole library, for the "All links" part. */
  latest: LinkResponse[];
  latestLoaded: boolean;
  latestFailed: boolean;
}
