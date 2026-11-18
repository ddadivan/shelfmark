import { Injectable } from '@nestjs/common';
import { CLEANUP_GROUP } from '@shelfmark/contracts';
import { HNSW_INDEX_PREDICATE, useHnswSettings } from '../../ai/embeddings/embedding-sql';
import { AiProviderRegistry } from '../../ai/providers/ai-provider.registry';
import { PrismaService } from '../../prisma/prisma.service';
import { CLEANUP_CHECK_KEY } from '../models/cleanup-check-key.const';
import { CLEANUP_RUN_LIMIT } from '../models/cleanup-run-limit.const';
import { NEAR_DUPLICATE_LIMIT } from '../models/near-duplicate-limit.const';
import type { CleanupCheck } from '../models/cleanup-check.interface';
import type { CleanupCheckContext } from '../models/cleanup-check-context.interface';
import type { CleanupCheckProgress } from '../models/cleanup-check-progress.interface';
import type { NearDuplicateLink } from '../models/near-duplicate-link.interface';
import { isNearDuplicate } from '../near-duplicate-match';

/**
 * Near-duplicates from the stored AI-3 vectors (nothing is sent anywhere). One step scans
 * `ChunkSize` of the user's live links with a vector of the current model by keyset cursor (link id)
 * and asks the HNSW index for each one's `NeighboursPerLink` nearest own live links (iterative scan,
 * as AI-3). Pairs passing `isNearDuplicate` are kept as id pairs; titles and URLs stay in memory.
 * The runner groups the pairs when the scan ends (`finishFindings`).
 */
@Injectable()
export class NearDuplicatesCheck implements CleanupCheck {
  readonly key = CLEANUP_CHECK_KEY.NearDuplicates;
  readonly group = CLEANUP_GROUP.Duplicates;
  readonly needsAi = true;
  readonly needsVectors = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: AiProviderRegistry,
  ) {}

  async run(ctx: CleanupCheckContext): Promise<CleanupCheckProgress> {
    const model = this.registry.embeddingsFor({ isDemo: ctx.isDemo }).model;
    const after = ctx.cursor ?? '00000000-0000-0000-0000-000000000000';
    const hits = await this.prisma.$transaction(async (tx) => {
      await useHnswSettings(tx);
      return tx.$queryRaw<{ sourceId: string; neighbourId: string | null; similarity: number }[]>`
        WITH chunk AS (
          SELECT e.link_id, e.embedding FROM link_embeddings e
          JOIN links l ON l.id = e.link_id AND l.user_id = e.user_id
          WHERE e.user_id = ${ctx.userId}::uuid AND e.model = ${model} AND l.deleted_at IS NULL
            AND e.link_id > ${after}::uuid
          ORDER BY e.link_id
          LIMIT ${CLEANUP_RUN_LIMIT.ChunkSize}
        )
        SELECT c.link_id::text AS "sourceId", n.link_id AS "neighbourId",
          coalesce(n.similarity, 0)::float8 AS similarity
        FROM chunk c
        LEFT JOIN LATERAL (
          SELECT e.link_id::text AS link_id, (1 - (e.embedding <=> c.embedding))::float8 AS similarity
          FROM link_embeddings e
          JOIN links l ON l.id = e.link_id AND l.user_id = e.user_id
          WHERE ${HNSW_INDEX_PREDICATE} AND e.user_id = ${ctx.userId}::uuid AND e.model = ${model}
            AND l.deleted_at IS NULL AND e.link_id <> c.link_id
          ORDER BY e.embedding <=> c.embedding
          LIMIT ${NEAR_DUPLICATE_LIMIT.NeighboursPerLink}
        ) n ON true
        ORDER BY c.link_id`;
    });
    const sources = [...new Set(hits.map((hit) => hit.sourceId))].sort();
    const close = hits.filter(
      (hit): hit is { sourceId: string; neighbourId: string; similarity: number } =>
        hit.neighbourId !== null && hit.similarity >= NEAR_DUPLICATE_LIMIT.SimilarityMin,
    );
    if (close.length > 0) await this.keepPairs(ctx, close);
    const cursor = sources.at(-1) ?? ctx.cursor;
    return {
      done: sources.length < CLEANUP_RUN_LIMIT.ChunkSize,
      cursor,
      checked: ctx.checked + sources.length,
    };
  }

  /** Adds the pairs that pass the host or title condition (deduplicated, smaller id first). */
  private async keepPairs(
    ctx: CleanupCheckContext,
    close: readonly { sourceId: string; neighbourId: string; similarity: number }[],
  ): Promise<void> {
    const ids = [...new Set(close.flatMap((hit) => [hit.sourceId, hit.neighbourId]))];
    const rows = await this.prisma.link.findMany({
      where: { userId: ctx.userId, deletedAt: null, id: { in: ids } },
      select: { id: true, url: true, title: true },
    });
    const links = new Map<string, NearDuplicateLink>(rows.map((row) => [row.id, row]));
    const known = new Set(ctx.findings.nearPairs.map(([a, b]) => `${a}|${b}`));
    for (const hit of close) {
      const a = links.get(hit.sourceId);
      const b = links.get(hit.neighbourId);
      if (a === undefined || b === undefined || !isNearDuplicate(hit.similarity, a, b)) continue;
      const pair: [string, string] =
        hit.sourceId < hit.neighbourId
          ? [hit.sourceId, hit.neighbourId]
          : [hit.neighbourId, hit.sourceId];
      const key = `${pair[0]}|${pair[1]}`;
      if (known.has(key)) continue;
      known.add(key);
      ctx.findings.nearPairs.push(pair);
    }
  }
}
