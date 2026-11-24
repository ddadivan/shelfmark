import { PAGE_LIMIT } from '@shelfmark/contracts';

/** How much each part of the Today page loads and shows. */
export const TODAY_LIMIT = {
  /** Links of "Back to these" (the due reminders, the longest due first). */
  Back: 3,
  /** Rows of "Saved this week"; the count covers one whole page. */
  WeekRows: 4,
  /** One page of this week's links, for the count and the "in folders" share. */
  WeekPage: PAGE_LIMIT.Max,
  /** Cards of the "All links" part. */
  Latest: 8,
} as const;
