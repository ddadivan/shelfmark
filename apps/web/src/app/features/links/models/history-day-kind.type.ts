import type { HISTORY_DAY_KIND } from './history-day-kind.const';

export type HistoryDayKind = (typeof HISTORY_DAY_KIND)[keyof typeof HISTORY_DAY_KIND];
