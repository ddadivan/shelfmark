import { Injectable, Logger } from '@nestjs/common';
import { CLEANUP_GROUP, CLEANUP_LIMIT, CLEANUP_SOURCE } from '@shelfmark/contracts';
import { TAG_SYNONYMS_LIMIT } from '../../ai/models/tag-synonyms-limit.const';
import { parseTagSynonymsOutput } from '../../ai/prompt/parse-tag-synonyms-output';
import { AiProviderRegistry } from '../../ai/providers/ai-provider.registry';
import { AiUsageService } from '../../ai/usage/ai-usage.service';
import { usageMonth } from '../../ai/usage/usage-month';
import { CLEANUP_CHECK_KEY } from '../models/cleanup-check-key.const';
import type { CleanupCheck } from '../models/cleanup-check.interface';
import type { CleanupCheckContext } from '../models/cleanup-check-context.interface';
import type { CleanupCheckProgress } from '../models/cleanup-check-progress.interface';
import { newCleanupId } from '../new-cleanup-id';
import { loadTagUsage } from './load-tag-usage';

/**
 * Similar tags by the model (ADR 0052 point 2): one call with up to `TagsSentMax` of the user's own
 * tags on live links (most used first) as keys `t1…`, names only. The answer is narrowed against the
 * keys sent and the pairs the rule step found; the report keeps at most `TagPairsMax` pairs in all. A
 * refusal or invalid output leaves the group empty; a provider failure also gives the month's
 * clean-up run back. The call is never inside a transaction; names never reach the logs.
 */
@Injectable()
export class TagSynonymsCheck implements CleanupCheck {
  private readonly logger = new Logger(TagSynonymsCheck.name);
  readonly key = CLEANUP_CHECK_KEY.TagSynonyms;
  readonly group = CLEANUP_GROUP.SimilarTags;
  readonly needsAi = true;
  readonly needsVectors = false;

  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly usage: AiUsageService,
  ) {}

  async run(ctx: CleanupCheckContext): Promise<CleanupCheckProgress> {
    const done = { done: true, cursor: null, checked: ctx.checked };
    const room = CLEANUP_LIMIT.TagPairsMax - ctx.findings.similarTags.length;
    const tags = await loadTagUsage(ctx.db, ctx.userId, TAG_SYNONYMS_LIMIT.TagsSentMax);
    if (room <= 0 || tags.length < 2) return done;
    const keyed = tags.map((tag, index) => ({ key: `t${index + 1}`, tag }));
    const idOf = new Map(keyed.map(({ key, tag }) => [key, tag.id]));
    const keyOf = new Map(keyed.map(({ key, tag }) => [tag.id, key]));
    const known = new Set(
      ctx.findings.similarTags.flatMap((pair) => {
        const a = keyOf.get(pair.tagIds[0]);
        const b = keyOf.get(pair.tagIds[1]);
        return a === undefined || b === undefined ? [] : [`${a}|${b}`];
      }),
    );
    const outcome = await this.registry
      .for({ isDemo: ctx.isDemo })
      .findTagSynonyms({ tags: keyed.map(({ key, tag }) => ({ key, name: tag.name })) });
    if (outcome.type !== 'output') {
      if (outcome.type === 'error') {
        await this.usage.refundCleanupRun(ctx.userId, usageMonth(new Date()));
      }
      this.logger.warn(`Tag synonyms: ${outcome.type}`);
      return done;
    }
    const pairs = parseTagSynonymsOutput(outcome.output, new Set(idOf.keys()), known);
    for (const pair of pairs.slice(0, room)) {
      const keep = idOf.get(pair.keep);
      const merge = idOf.get(pair.merge);
      if (keep === undefined || merge === undefined) continue;
      ctx.findings.similarTags.push({
        id: newCleanupId(),
        source: CLEANUP_SOURCE.Ai,
        tagIds: [keep, merge],
      });
    }
    this.logger.log(`Tag synonyms: ${tags.length} tag(s) sent, ${pairs.length} pair(s) kept`);
    return done;
  }
}
