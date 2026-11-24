import type { LinkResponse } from '@shelfmark/contracts';

const MS_PER_DAY = 86_400_000;

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
