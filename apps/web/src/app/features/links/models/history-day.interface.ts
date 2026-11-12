import type { LinkResponse } from '@shelfmark/contracts';
import type { HistoryDayKind } from './history-day-kind.type';

/** The links opened on one local calendar day, newest first. */
export interface HistoryDay {
  /** Local date, `YYYY-MM-DD`; stable track key. */
  readonly key: string;
  readonly kind: HistoryDayKind;
  /** Local midnight of the day, for the title of an older day. */
  readonly date: Date;
  readonly links: LinkResponse[];
}
