import type { LinkResponse } from '@shelfmark/contracts';
import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';

/** The links opened in the last `days` days, in the order given (the history is newest first). */
export function openedWithin(
  links: readonly LinkResponse[],
  days: number,
  now: number,
): LinkResponse[] {
  const since = now - days * MS_PER_DAY;
  return links.filter(
    (link) => link.lastOpenedAt !== null && Date.parse(link.lastOpenedAt) >= since,
  );
}
