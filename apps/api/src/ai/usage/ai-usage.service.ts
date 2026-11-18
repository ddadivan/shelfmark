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

  /** Link texts embedded this month (search by meaning, ADR 0050 point 5). */
  async embedsUsed(userId: string, now = new Date()): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ embeds: number }[]>`
      SELECT embeds FROM ai_usage WHERE user_id = ${userId}::uuid AND month = ${usageMonth(now)}::date`;
    return rows[0]?.embeds ?? 0;
  }

  /**
   * Takes up to `wanted` embeddings from this month's allowance (a separate counter: embeddings never
   * use the link limit or the backfill allowance) and answers the month and how many were granted
   * (0 when it is used up). The row is locked for the update, so racing passes never exceed it.
   */
  async reserveEmbeds(
    userId: string,
    tier: AiTier,
    wanted: number,
    now = new Date(),
  ): Promise<{ month: string; granted: number }> {
    const month = usageMonth(now);
    const limit = AI_QUOTA[tier].embedsPerMonth;
    if (limit <= 0 || wanted <= 0) return { month, granted: 0 };
    await this.prisma.$executeRaw`
      INSERT INTO ai_usage (user_id, month) VALUES (${userId}::uuid, ${month}::date)
      ON CONFLICT (user_id, month) DO NOTHING`;
    const rows = await this.prisma.$queryRaw<{ granted: number }[]>`
      WITH current AS (
        SELECT embeds FROM ai_usage
        WHERE user_id = ${userId}::uuid AND month = ${month}::date FOR UPDATE
      )
      UPDATE ai_usage AS u
      SET embeds = u.embeds + LEAST(${wanted}::int, ${limit}::int - c.embeds)
      FROM current AS c
      WHERE u.user_id = ${userId}::uuid AND u.month = ${month}::date AND c.embeds < ${limit}::int
      RETURNING LEAST(${wanted}::int, ${limit}::int - c.embeds)::int AS granted`;
    return { month, granted: rows[0]?.granted ?? 0 };
  }

  /** Gives back embeddings whose provider call produced no vectors. */
  async refundEmbeds(userId: string, month: string, count: number): Promise<void> {
    if (count <= 0) return;
    await this.prisma.$executeRaw`
      UPDATE ai_usage SET embeds = GREATEST(embeds - ${count}::int, 0)
      WHERE user_id = ${userId}::uuid AND month = ${month}::date`;
  }

  /** Counts one search query against this month's allowance; `null` when it is used up. */
  async reserveSearchQuery(userId: string, tier: AiTier, now = new Date()): Promise<string | null> {
    const limit = AI_QUOTA[tier].searchQueriesPerMonth;
    if (limit <= 0) return null;
    const month = usageMonth(now);
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      INSERT INTO ai_usage (user_id, month, search_queries)
      VALUES (${userId}::uuid, ${month}::date, 1)
      ON CONFLICT (user_id, month) DO UPDATE SET search_queries = ai_usage.search_queries + 1
      WHERE ai_usage.search_queries < ${limit}
      RETURNING search_queries AS n`;
    return rows.length > 0 ? month : null;
  }

  /** Gives back a search query whose provider call produced no vector. */
  async refundSearchQuery(userId: string, month: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_usage SET search_queries = search_queries - 1
      WHERE user_id = ${userId}::uuid AND month = ${month}::date AND search_queries > 0`;
  }
  /** AI clean-up runs left this month (ADR 0052 point 3; a cheap read, `reserveCleanupRun` decides). */
  async cleanupRunsLeft(userId: string, tier: AiTier, now = new Date()): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      SELECT cleanup_runs AS n FROM ai_usage
      WHERE user_id = ${userId}::uuid AND month = ${usageMonth(now)}::date`;
    return Math.max(0, AI_QUOTA[tier].cleanupAiRunsPerMonth - (rows[0]?.n ?? 0));
  }

  /**
   * Counts one AI clean-up run against this month's allowance in one statement; answers the month
   * (for a refund) or `null` when none is left. Pass the transaction of the run, if any.
   */
  async reserveCleanupRun(
    userId: string,
    tier: AiTier,
    now = new Date(),
    db: AiDbClient = this.prisma,
  ): Promise<string | null> {
    const limit = AI_QUOTA[tier].cleanupAiRunsPerMonth;
    if (limit <= 0) return null;
    const month = usageMonth(now);
    const rows = await db.$queryRaw<{ n: number }[]>`
      INSERT INTO ai_usage (user_id, month, cleanup_runs) VALUES (${userId}::uuid, ${month}::date, 1)
      ON CONFLICT (user_id, month) DO UPDATE SET cleanup_runs = ai_usage.cleanup_runs + 1
      WHERE ai_usage.cleanup_runs < ${limit}
      RETURNING cleanup_runs AS n`;
    return rows.length > 0 ? month : null;
  }

  /** Gives back an AI clean-up run whose model call produced no answer. */
  async refundCleanupRun(userId: string, month: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_usage SET cleanup_runs = cleanup_runs - 1
      WHERE user_id = ${userId}::uuid AND month = ${month}::date AND cleanup_runs > 0`;
  }
}
