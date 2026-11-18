import { KEEP_REASON, type KeepReason, type LinkResponse } from '@shelfmark/contracts';

type Score = (link: LinkResponse) => number;

/**
 * The API's keep rule (plan 1.3) over mock links: in a live folder over Unsorted, then a note, a
 * future reminder, more tags, favourite, most recently opened, oldest, then the smaller id. The
 * reason is the first criterion that set the keeper apart.
 */
export function pickKeep(
  members: readonly LinkResponse[],
  liveFolder: (id: string) => boolean,
  now: number,
): { keep: LinkResponse; reason: KeepReason } | null {
  const criteria: ReadonlyArray<readonly [KeepReason, Score]> = [
    [KEEP_REASON.InFolder, (link) => (link.folderId !== null && liveFolder(link.folderId) ? 1 : 0)],
    [KEEP_REASON.HasNote, (link) => ((link.note ?? '').trim() === '' ? 0 : 1)],
    [
      KEEP_REASON.HasReminder,
      (link) => (link.remindAt !== null && Date.parse(link.remindAt) > now ? 1 : 0),
    ],
    [KEEP_REASON.MoreTags, (link) => link.tags.length],
    [KEEP_REASON.Favorite, (link) => (link.isFavorite ? 1 : 0)],
    [
      KEEP_REASON.RecentlyOpened,
      (link) =>
        link.lastOpenedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(link.lastOpenedAt),
    ],
    [KEEP_REASON.Oldest, (link) => -Date.parse(link.createdAt)],
  ];
  let left = [...members];
  let reason: KeepReason | null = null;
  for (const [why, score] of criteria) {
    if (left.length <= 1) {
      break;
    }
    const best = Math.max(...left.map(score));
    const next = left.filter((link) => score(link) === best);
    if (next.length < left.length && reason === null) {
      reason = why;
    }
    left = next;
  }
  const [keep] = left.sort((a, b) => a.id.localeCompare(b.id));
  return keep ? { keep, reason: reason ?? KEEP_REASON.Oldest } : null;
}
