import { Injectable } from '@nestjs/common';
import { AI_QUOTA, type AiTier, type AiUsage } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import type { AiDbClient } from '../models/ai-db-client.type';
import { usageMonth, usageResetsOn } from './usage-month';

/**
 * AI usage counts (never content). The monthly count (`ai_usage`, one row per user and UTC month)
 * covers save, draft and rewrite jobs; the one-time backfill allowance is `ai_settings.backfill_used`.
 * Every reserve is one parameterised statement, so two jobs racing for the last link cannot both win.
 */
@Injectable()
export class AiUsageService {
  constructor(private readonly prisma: PrismaService) {}

  /** The usage block of `AiSettingsResponse`. */
  async read(
    userId: string,
    tier: AiTier,
    backfillUsed: number,
    now = new Date(),
  ): Promise<AiUsage> {
    const month = usageMonth(now);
    const rows = await this.prisma.$queryRaw<{ links: number }[]>`
      SELECT links FROM ai_usage WHERE user_id = ${userId}::uuid AND month = ${month}::date`;
    const limits = AI_QUOTA[tier];
    return {
      linksUsed: rows[0]?.links ?? 0,
      linksLimit: limits.linksPerMonth,
      resetsOn: usageResetsOn(now),
      backfillUsed,
      backfillLimit: limits.backfillLinks,
    };
  }

  /** Whether one more link fits this month (a cheap read; `reserve` stays authoritative). */
  async hasRoom(userId: string, tier: AiTier, now = new Date()): Promise<boolean> {
    const usage = await this.read(userId, tier, 0, now);
    return usage.linksUsed < usage.linksLimit;
  }

  /**
   * Counts one link against this month's limit. Answers the month it was counted in (for a refund),
   * or `null` when the limit is reached: the job is then skipped with reason `quota`.
   */
  async reserve(userId: string, tier: AiTier, now = new Date()): Promise<string | null> {
    const limit = AI_QUOTA[tier].linksPerMonth;
    if (limit <= 0) return null;
    const month = usageMonth(now);
    const rows = await this.prisma.$queryRaw<{ links: number }[]>`
      INSERT INTO ai_usage (user_id, month, links) VALUES (${userId}::uuid, ${month}::date, 1)
      ON CONFLICT (user_id, month) DO UPDATE SET links = ai_usage.links + 1
      WHERE ai_usage.links < ${limit}
      RETURNING links`;
    return rows.length > 0 ? month : null;
  }

  /** Gives back a link counted for a provider call that produced no response. */
  async refund(userId: string, month: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_usage SET links = links - 1
      WHERE user_id = ${userId}::uuid AND month = ${month}::date AND links > 0`;
  }

  /**
   * Takes up to `wanted` links from the one-time backfill allowance and answers how many were
   * granted (0 when it is used up or the user has no settings row). Pass the transaction that holds
   * the settings row lock, if any.
   */
  async reserveBackfill(
    userId: string,
    tier: AiTier,
    wanted: number,
    db: AiDbClient = this.prisma,
  ): Promise<number> {
    const limit = AI_QUOTA[tier].backfillLinks;
    if (limit <= 0 || wanted <= 0) return 0;
    const rows = await db.$queryRaw<{ granted: number }[]>`
      WITH current AS (
        SELECT backfill_used FROM ai_settings WHERE user_id = ${userId}::uuid FOR UPDATE
      )
      UPDATE ai_settings AS s
      SET backfill_used = s.backfill_used + LEAST(${wanted}::int, ${limit}::int - c.backfill_used)
      FROM current AS c
      WHERE s.user_id = ${userId}::uuid AND c.backfill_used < ${limit}::int
      RETURNING LEAST(${wanted}::int, ${limit}::int - c.backfill_used)::int AS granted`;
    return rows[0]?.granted ?? 0;
  }

  /** Gives back backfill links whose provider call produced no response. */
  async refundBackfill(userId: string, count: number): Promise<void> {
    if (count <= 0) return;
    await this.prisma.$executeRaw`
      UPDATE ai_settings SET backfill_used = GREATEST(backfill_used - ${count}::int, 0)
      WHERE user_id = ${userId}::uuid`;
  }
}
