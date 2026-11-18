import { CLEANUP_LIMIT, CLEANUP_SOURCE, DUPLICATE_REASON } from '@shelfmark/contracts';
import type { StoredCleanupFindings } from './models/stored-cleanup-findings.interface';
import { groupNearPairs } from './near-duplicate-match';
import { newCleanupId } from './new-cleanup-id';

/**
 * Ends a run's findings: the near-duplicate pairs found so far become "same page" groups (links
 * already in an exact group left out, at most `DuplicateGroupsMax` groups in all) and the pending
 * list and pairs are cleared. Used when the pass finishes and when a stalled run fails.
 */
export function finishFindings(findings: StoredCleanupFindings): StoredCleanupFindings {
  const exact = new Set(findings.duplicates.flatMap((group) => group.linkIds));
  const duplicates = [...findings.duplicates];
  for (const linkIds of groupNearPairs(findings.nearPairs, exact)) {
    if (duplicates.length >= CLEANUP_LIMIT.DuplicateGroupsMax) break;
    duplicates.push({
      id: newCleanupId(),
      reason: DUPLICATE_REASON.SamePage,
      source: CLEANUP_SOURCE.Ai,
      linkIds,
    });
  }
  return { duplicates, similarTags: findings.similarTags, pending: [], nearPairs: [] };
}
