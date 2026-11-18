import { Injectable } from '@nestjs/common';
import { CLEANUP_GROUP, CLEANUP_LIMIT, CLEANUP_SOURCE } from '@shelfmark/contracts';
import { CLEANUP_CHECK_KEY } from '../models/cleanup-check-key.const';
import type { CleanupCheck } from '../models/cleanup-check.interface';
import type { CleanupCheckContext } from '../models/cleanup-check-context.interface';
import type { CleanupCheckProgress } from '../models/cleanup-check-progress.interface';
import { newCleanupId } from '../new-cleanup-id';
import { tagVariantKey } from '../tag-variant-key';
import { loadTagUsage } from './load-tag-usage';

/**
 * Similar tags by rule (no AI): tags with the same `tagVariantKey`. In each set the tag on most live
 * links (then the older) is the suggested keep and every other one a pair with it; at most
 * `TagPairsMax` pairs, so one apply covers them.
 */
@Injectable()
export class TagVariantsCheck implements CleanupCheck {
  readonly key = CLEANUP_CHECK_KEY.TagVariants;
  readonly group = CLEANUP_GROUP.SimilarTags;
  readonly needsAi = false;
  readonly needsVectors = false;

  async run(ctx: CleanupCheckContext): Promise<CleanupCheckProgress> {
    const tags = await loadTagUsage(ctx.db, ctx.userId);
    const sets = new Map<string, string[]>();
    for (const tag of tags) {
      const key = tagVariantKey(tag.name);
      if (key === '') continue;
      sets.set(key, [...(sets.get(key) ?? []), tag.id]);
    }
    for (const ids of sets.values()) {
      const [keep, ...others] = ids;
      if (keep === undefined) continue;
      for (const other of others) {
        if (ctx.findings.similarTags.length >= CLEANUP_LIMIT.TagPairsMax) break;
        ctx.findings.similarTags.push({
          id: newCleanupId(),
          source: CLEANUP_SOURCE.Rule,
          tagIds: [keep, other],
        });
      }
    }
    return { done: true, cursor: ctx.cursor, checked: ctx.checked };
  }
}
