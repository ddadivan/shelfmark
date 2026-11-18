import type { RECENT_VIEW } from './recent-view.const';

/** One of `RECENT_VIEW`. */
export type RecentView = (typeof RECENT_VIEW)[keyof typeof RECENT_VIEW];
