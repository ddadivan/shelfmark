import { Injectable } from '@nestjs/common';
import { AI_QUOTA, AI_SEARCH_STATE, type AiSearchStatus, type AiTier } from '@shelfmark/contracts';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_EMBED_LIMIT } from '../models/ai-embed-limit.const';
import type { StoredAiSettings } from '../models/stored-ai-settings.interface';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiUsageService } from '../usage/ai-usage.service';

const OFF: AiSearchStatus = { state: AI_SEARCH_STATE.Off, ready: 0, total: 0 };

/**
 * Readiness of search by meaning ("N of M links ready", ADR 0050): `ready` counts live links whose
 * vector is current (the user's model, not stale, built with the current note setting), `total`
 * the live links, from one grouped count on the session user. From `ReadyShareMin` on the state is
 * `ready`; below it `unavailable` after a recent provider failure, `quota` when this month's
 * embeddings are used up, else `processing`.
 */
@Injectable()
export class AiSearchStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: AiUsageService,
    private readonly registry: AiProviderRegistry,
  ) {}

  /** The embedding model a user's vectors must have, by `u.is_demo` (`u` is `users`). */
  currentModelSql(): Prisma.Sql {
    const regular = this.registry.embeddingsFor({ isDemo: false }).model;
    const demo = this.registry.embeddingsFor({ isDemo: true }).model;
    return Prisma.sql`(CASE WHEN u.is_demo THEN ${demo} ELSE ${regular} END)`;
  }

  async status(userId: string, stored: StoredAiSettings, tier: AiTier): Promise<AiSearchStatus> {
    if (!stored.settings.enabled || !stored.settings.meaningSearch) return OFF;
    const { ready, total } = await this.counts(userId, stored.settings.includeNotes);
    if (total === 0 || ready / total >= AI_EMBED_LIMIT.ReadyShareMin) {
      return { state: AI_SEARCH_STATE.Ready, ready, total };
    }
    const failedAt = stored.embedFailedAt?.getTime();
    if (failedAt !== undefined && Date.now() - failedAt < AI_EMBED_LIMIT.UnavailableWindowMs) {
      return { state: AI_SEARCH_STATE.Unavailable, ready, total };
    }
    if ((await this.usage.embedsUsed(userId)) >= AI_QUOTA[tier].embedsPerMonth) {
      return { state: AI_SEARCH_STATE.Quota, ready, total };
    }
    return { state: AI_SEARCH_STATE.Processing, ready, total };
  }

  private async counts(
    userId: string,
    includeNotes: boolean,
  ): Promise<{ ready: number; total: number }> {
    const rows = await this.prisma.$queryRaw<{ ready: number; total: number }[]>`
      SELECT count(l.id)::int AS total,
        (count(e.link_id) FILTER (
          WHERE NOT e.stale AND e.with_note = ${includeNotes}
            AND e.model = ${this.currentModelSql()}
        ))::int AS ready
      FROM users u
      LEFT JOIN links l ON l.user_id = u.id AND l.deleted_at IS NULL
      LEFT JOIN link_embeddings e ON e.link_id = l.id AND e.user_id = u.id
      WHERE u.id = ${userId}::uuid`;
    return { ready: rows[0]?.ready ?? 0, total: rows[0]?.total ?? 0 };
  }
}
