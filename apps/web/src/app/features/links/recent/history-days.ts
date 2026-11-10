import type { LinkResponse } from '@shelfmark/contracts';
import { HISTORY_DAY_KIND } from './models/history-day-kind.const';
import type { HistoryDayKind } from './models/history-day-kind.type';
import type { HistoryDay } from './models/history-day.interface';

/** Days back that still count as "earlier this week". */
const WEEK_DAYS = 6;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${day.getFullYear()}-${month}-${date}`;
}

function kindOf(daysAgo: number): HistoryDayKind {
  if (daysAgo <= 0) {
    return HISTORY_DAY_KIND.Today;
  }
  if (daysAgo === 1) {
    return HISTORY_DAY_KIND.Yesterday;
  }
  return daysAgo <= WEEK_DAYS ? HISTORY_DAY_KIND.Week : HISTORY_DAY_KIND.Date;
}

/**
 * Splits the history (newest first) into local-time day groups: today, yesterday, the rest of the
 * week (one group), then one group per older day. A link without `lastOpenedAt` is skipped; one
 * "from the future" (clock skew) counts as today.
 */
export function groupByDay(links: readonly LinkResponse[], now: Date): HistoryDay[] {
  const today = startOfDay(now).getTime();
  const days: HistoryDay[] = [];
  for (const link of links) {
    if (link.lastOpenedAt === null) {
      continue;
    }
    const day = startOfDay(new Date(link.lastOpenedAt));
    const kind = kindOf(Math.round((today - day.getTime()) / 86_400_000));
    const key = kind === HISTORY_DAY_KIND.Week ? HISTORY_DAY_KIND.Week : dayKey(day);
    const last = days[days.length - 1];
    if (last?.key === key) {
      last.links.push(link);
    } else {
      days.push({ key, kind, date: day, links: [link] });
    }
  }
  return days;
}
