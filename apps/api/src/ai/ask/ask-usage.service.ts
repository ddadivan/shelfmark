import { Injectable } from '@nestjs/common';
import { AI_QUOTA, type AiTier, type AskAllowance } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { ASK_LOCK_PREFIX } from '../models/ask-lock.const';
import { ASK_SERVICE_LIMIT } from '../models/ask-service-limit.const';
import { usageMonth } from '../usage/usage-month';
import { toAskAllowance } from './to-ask-allowance';

/** `YYYY-MM-DD` of the UTC day of `now` (the `ai_ask_usage.day` key). */
export function askDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Ask question counts, the deeper-answer counts (ADR 0055) and the one-question lease (ADR 0052
 * point 7). Counts only, per user and UTC day; the month is the sum of its days. Every statement runs on the session user's rows.
 */
@Injectable()
export class AskUsageService {
  constructor(private readonly prisma: PrismaService) {}

  /** Today's and this month's questions. */
  async counts(userId: string, now: Date = new Date()): Promise<{ day: number; month: number }> {
    const rows = await this.prisma.$queryRaw<{ day: number; month: number }[]>`
      SELECT
        COALESCE(SUM(questions) FILTER (WHERE day = ${askDay(now)}::date), 0)::int AS day,
        COALESCE(SUM(questions), 0)::int AS month
      FROM ai_ask_usage
      WHERE user_id = ${userId}::uuid AND day >= ${usageMonth(now)}::date
        AND day <= ${askDay(now)}::date`;
    return { day: rows[0]?.day ?? 0, month: rows[0]?.month ?? 0 };
  }

  async allowance(userId: string, tier: AiTier, now: Date = new Date()): Promise<AskAllowance> {
    const used = await this.counts(userId, now);
    return toAskAllowance(AI_QUOTA[tier], used.day, used.month, now);
  }

  /**
   * Counts one question before the model call: under the advisory lock `ai-ask:<userId>`, one
   * statement inserts or increments today's row only while today is under the day limit and the
   * month under the month limit. Answers the day it was counted on (for a refund), or `null`.
   */
  async reserve(userId: string, tier: AiTier, now: Date = new Date()): Promise<string | null> {
    const limits = AI_QUOTA[tier];
    const day = askDay(now);
    const month = usageMonth(now);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${ASK_LOCK_PREFIX + userId}, 0))`;
      const rows = await tx.$queryRaw<{ questions: number }[]>`
        INSERT INTO ai_ask_usage (user_id, day, questions)
        SELECT ${userId}::uuid, ${day}::date, 1
        WHERE (SELECT COALESCE(SUM(questions), 0) FROM ai_ask_usage
                WHERE user_id = ${userId}::uuid AND day = ${day}::date) < ${limits.questionsPerDay}
          AND (SELECT COALESCE(SUM(questions), 0) FROM ai_ask_usage
                WHERE user_id = ${userId}::uuid AND day >= ${month}::date AND day <= ${day}::date)
              < ${limits.questionsPerMonth}
        ON CONFLICT (user_id, day) DO UPDATE SET questions = ai_ask_usage.questions + 1
        RETURNING questions`;
      return rows.length > 0 ? day : null;
    });
  }

  /**
   * Counts one deeper answer (ADR 0055 point 1) on the day its question was counted, under the same
   * advisory lock: one statement increments `deep` only while the day's and the month's deep counts
   * are under the tier's deep limits. `false` when the deep allowance is used up.
   */
  async reserveDeep(
    userId: string,
    tier: AiTier,
    day: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const limits = AI_QUOTA[tier];
    const month = usageMonth(now);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${ASK_LOCK_PREFIX + userId}, 0))`;
      const rows = await tx.$queryRaw<{ deep: number }[]>`
        UPDATE ai_ask_usage SET deep = deep + 1
        WHERE user_id = ${userId}::uuid AND day = ${day}::date
          AND deep < questions
          AND deep < ${limits.deepQuestionsPerDay}
          AND (SELECT COALESCE(SUM(deep), 0) FROM ai_ask_usage
                WHERE user_id = ${userId}::uuid AND day >= ${month}::date AND day <= ${day}::date)
              < ${limits.deepQuestionsPerMonth}
        RETURNING deep`;
      return rows.length > 0;
    });
  }

  /** Gives a reserved deeper answer back (refunded together with its question, or no deep text). */
  async refundDeep(userId: string, day: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_ask_usage SET deep = deep - 1
      WHERE user_id = ${userId}::uuid AND day = ${day}::date AND deep > 0`;
  }

  /** Gives a reserved question back (failure before any text, refusal). */
  async refund(userId: string, day: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_ask_usage SET questions = questions - 1, deep = LEAST(deep, questions - 1)
      WHERE user_id = ${userId}::uuid AND day = ${day}::date AND questions > 0`;
  }

  /**
   * Takes the one-question lease on the user's settings row (plain SQL, `updated_at` stays). Answers
   * the lease's end, which releases it, or `null` while another question of the user runs.
   */
  async takeLease(userId: string): Promise<Date | null> {
    const rows = await this.prisma.$queryRaw<{ until: Date }[]>`
      UPDATE ai_settings
      SET ask_lease_until = now() + make_interval(secs => ${ASK_SERVICE_LIMIT.LeaseMs / 1000})
      WHERE user_id = ${userId}::uuid
        AND (ask_lease_until IS NULL OR ask_lease_until < now())
      RETURNING ask_lease_until AS until`;
    return rows[0]?.until ?? null;
  }

  /** Releases the lease taken by `takeLease` (only that one: a later lease stays). */
  async releaseLease(userId: string, until: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE ai_settings SET ask_lease_until = NULL
      WHERE user_id = ${userId}::uuid AND ask_lease_until = ${until}`;
  }
}
