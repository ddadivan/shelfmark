import { Injectable } from '@nestjs/common';
import {
  CLEANUP_GROUP,
  CLEANUP_LIMIT,
  CLEANUP_SOURCE,
  DUPLICATE_REASON,
} from '@shelfmark/contracts';
import { CLEANUP_CHECK_KEY } from '../models/cleanup-check-key.const';
import type { CleanupCheck } from '../models/cleanup-check.interface';
import type { CleanupCheckContext } from '../models/cleanup-check-context.interface';
import type { CleanupCheckProgress } from '../models/cleanup-check-progress.interface';
import { newCleanupId } from '../new-cleanup-id';

/**
 * Exact duplicates (no AI): the user's live links sharing `normalized_url` (index
 * `(user_id, normalized_url)`), one grouped query; oldest groups first, at most
 * `DuplicateGroupsMax` groups of at most `GroupSizeMax` links (the oldest saves).
 */
@Injectable()
export class ExactDuplicatesCheck implements CleanupCheck {
  readonly key = CLEANUP_CHECK_KEY.ExactDuplicates;
  readonly group = CLEANUP_GROUP.Duplicates;
  readonly needsAi = false;
  readonly needsVectors = false;

  async run(ctx: CleanupCheckContext): Promise<CleanupCheckProgress> {
    const rows = await ctx.db.$queryRaw<{ ids: string[] }[]>`
      SELECT (array_agg(id::text ORDER BY created_at, id))[1:${CLEANUP_LIMIT.GroupSizeMax}::int] AS ids
      FROM links
      WHERE user_id = ${ctx.userId}::uuid AND deleted_at IS NULL
      GROUP BY normalized_url
      HAVING count(*) > 1
      ORDER BY min(created_at), min(id::text)
      LIMIT ${CLEANUP_LIMIT.DuplicateGroupsMax}`;
    for (const row of rows) {
      ctx.findings.duplicates.push({
        id: newCleanupId(),
        reason: DUPLICATE_REASON.SameAddress,
        source: CLEANUP_SOURCE.Rule,
        linkIds: row.ids,
      });
    }
    return { done: true, cursor: ctx.cursor, checked: ctx.checked };
  }
}
