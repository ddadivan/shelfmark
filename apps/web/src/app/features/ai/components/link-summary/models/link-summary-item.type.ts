import type { LinkResponse } from '@shelfmark/contracts';

/** What the summary of a card or row reads from its link; a public collection's link has none of it. */
export type LinkSummaryItem = Partial<
  Pick<LinkResponse, 'summary' | 'summarySource' | 'aiStatus' | 'createdAt'>
>;
