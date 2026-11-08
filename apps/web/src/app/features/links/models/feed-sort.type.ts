import type { FEED_SORT } from './feed-sort.const';

export type FeedSort = (typeof FEED_SORT)[keyof typeof FEED_SORT];
