import type { HISTORY_HEADING_LEVEL } from './history-heading-level.const';

/** Heading level of the day title: 2 or 3. */
export type HistoryHeadingLevel =
  (typeof HISTORY_HEADING_LEVEL)[keyof typeof HISTORY_HEADING_LEVEL];
