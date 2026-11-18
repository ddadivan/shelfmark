import { KEEP_REASON, type KeepReason } from '@shelfmark/contracts';
import type { KeepCandidate } from './models/keep-candidate.interface';
import type { KeepChoice } from './models/keep-choice.interface';

/** Higher is better; criteria in rule order. */
const CRITERIA: readonly { reason: KeepReason; score: (link: KeepCandidate) => number }[] = [
  { reason: KEEP_REASON.InFolder, score: (link) => (link.inFolder ? 1 : 0) },
  { reason: KEEP_REASON.HasNote, score: (link) => (link.hasNote ? 1 : 0) },
  { reason: KEEP_REASON.HasReminder, score: (link) => (link.hasReminder ? 1 : 0) },
  { reason: KEEP_REASON.MoreTags, score: (link) => link.tagCount },
  { reason: KEEP_REASON.Favorite, score: (link) => (link.isFavorite ? 1 : 0) },
  {
    reason: KEEP_REASON.RecentlyOpened,
    score: (link) => link.lastOpenedAt?.getTime() ?? Number.NEGATIVE_INFINITY,
  },
  // Oldest wins: the earlier save scores higher.
  { reason: KEEP_REASON.Oldest, score: (link) => -link.createdAt.getTime() },
];

/**
 * The keep rule (plan 1.3): in a folder over Unsorted, then a note, then a future reminder, then more
 * tags, then favourite, then most recently opened, then oldest (then the smaller id, so the choice is
 * stable). The reason is the first criterion that set the keeper apart from the others.
 */
export function pickKeep(candidates: readonly KeepCandidate[]): KeepChoice | null {
  if (candidates.length === 0) return null;
  let left = [...candidates];
  let reason: KeepReason | null = null;
  for (const criterion of CRITERIA) {
    if (left.length === 1) break;
    const best = Math.max(...left.map(criterion.score));
    const next = left.filter((link) => criterion.score(link) === best);
    if (next.length < left.length && reason === null) reason = criterion.reason;
    left = next;
  }
  left.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const keep = left[0] as KeepCandidate;
  return { keepId: keep.id, reason: reason ?? KEEP_REASON.Oldest };
}
