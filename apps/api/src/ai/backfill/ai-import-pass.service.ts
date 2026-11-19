import { Injectable, Logger } from '@nestjs/common';
import {
  AI_BACKFILL_STATE,
  AI_QUOTA,
  IMPORT_AI_STATE,
  IMPORT_LIMIT,
  type ImportAiState,
} from '@shelfmark/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiBackgroundService } from '../background/ai-background.service';
import { AI_CATCH_UP_LIMIT } from '../models/ai-catch-up-limit.const';
import { AI_BACKFILL_LIMIT } from '../models/ai-backfill-limit.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AiBackfillService } from './ai-backfill.service';

/** Link AI states a pass may (re)process, like the backfill itself. */
const REDO_STATES: string[] = [AI_JOB_STATE.Failed, AI_JOB_STATE.Skipped];

/**
 * The AI pass of an import (ADR 0056 decision 9): starts a backfill run scoped to the import after
 * its `finish`, or marks the pass `skipped` and gives the prepaid units back. The run itself is
 * claimed, submitted and applied by `AiBackfillService` / `AiBackfillResultsService`. Every
 * statement filters by the user; lock order: the `ai_settings` row, then the `imports` row.
 */
@Injectable()
export class AiImportPassService {
  private readonly logger = new Logger(AiImportPassService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly backfill: AiBackfillService,
    private readonly background: AiBackgroundService,
  ) {}

  /**
   * Moves the units of the user's last AI grouping (`ai_settings.import_ai_prepaid`) onto the
   * import (`imports.ai_prepaid`) and zeroes them, in the caller's transaction under the settings
   * row lock, so two starts cannot take the same units. The grouping token is cleared too: a late
   * failure of that grouping can no longer give the units back.
   */
  async takeGroupingUnits(
    tx: Prisma.TransactionClient,
    userId: string,
    importId: string,
  ): Promise<void> {
    const rows = await tx.$queryRaw<{ n: number }[]>`
      SELECT import_ai_prepaid AS n FROM ai_settings WHERE user_id = ${userId}::uuid FOR UPDATE`;
    const units = rows[0]?.n ?? 0;
    if (units <= 0) return;
    await tx.$executeRaw`
      UPDATE ai_settings
      SET import_ai_prepaid = 0, import_ai_grouping_id = NULL, import_ai_prepaid_at = NULL
      WHERE user_id = ${userId}::uuid`;
    await tx.$executeRaw`
      UPDATE imports SET ai_prepaid = ${units}::int
      WHERE id = ${importId}::uuid AND user_id = ${userId}::uuid`;
  }

  /**
   * After the import's `finish`: starts the scoped run when AI is on, the tier has a backfill
   * allowance and no run is in progress; otherwise the pass is `skipped` and its units go back.
   * Idempotent: a pass that has a state already is left alone. Answers nothing for an import that
   * did not ask for the pass.
   */
  async begin(userId: string, importId: string): Promise<void> {
    let startRun = false;
    const state = await this.prisma.$transaction(async (tx): Promise<ImportAiState | null> => {
      const locked = await tx.$queryRaw<{ enabled: boolean; state: string; used: number }[]>`
        SELECT enabled, backfill_state AS state, backfill_used AS used FROM ai_settings
        WHERE user_id = ${userId}::uuid FOR UPDATE`;
      const row = await tx.$queryRaw<
        { requested: boolean; state: string | null; prepaid: number }[]
      >`
        SELECT ai_requested AS requested, ai_state AS state, ai_prepaid AS prepaid FROM imports
        WHERE id = ${importId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      const record = row[0];
      if (record === undefined || !record.requested || record.state !== null) return null;
      const settings = locked[0];
      const entitlements = await this.settings.entitlements(tx, userId);
      const limit = AI_QUOTA[entitlements.aiTier].backfillLinks;
      const canRun =
        settings !== undefined &&
        settings.enabled &&
        settings.state !== AI_BACKFILL_STATE.Running &&
        limit > 0;
      if (!canRun) {
        await this.release(tx, userId, importId, record.prepaid, IMPORT_AI_STATE.Skipped, 0);
        return IMPORT_AI_STATE.Skipped;
      }
      const eligible = await tx.link.count({
        where: {
          userId,
          importId,
          deletedAt: null,
          summary: null,
          OR: [{ aiStatus: null }, { aiStatus: { in: REDO_STATES } }],
        },
      });
      // The prepaid units are already counted in `backfill_used`.
      const capacity = Math.max(0, limit - settings.used) + record.prepaid;
      const total = Math.min(eligible, capacity);
      if (total <= 0) {
        await this.release(tx, userId, importId, record.prepaid, IMPORT_AI_STATE.Done, 0);
        return IMPORT_AI_STATE.Done;
      }
      await tx.$executeRaw`
        UPDATE ai_settings
        SET backfill_state = ${AI_BACKFILL_STATE.Running}, backfill_cursor = NULL,
          backfill_total = ${total}::int, backfill_done = 0, backfill_started_at = now(),
          backfill_import_id = ${importId}::uuid, updated_at = now()
        WHERE user_id = ${userId}::uuid`;
      await tx.$executeRaw`
        UPDATE imports SET ai_state = ${IMPORT_AI_STATE.Running}, ai_total = ${total}::int
        WHERE id = ${importId}::uuid AND user_id = ${userId}::uuid`;
      startRun = true;
      return IMPORT_AI_STATE.Running;
    });
    if (state === null) return;
    // Counts only: shows on prod that a pass began or why it did not.
    this.logger.log(`Import AI pass: ${state}`);
    if (startRun) {
      this.background.defer(() =>
        this.backfill.advance(userId, Date.now() + AI_BACKFILL_LIMIT.StartBudgetMs),
      );
    }
  }

  /** Gives the import's unused units back and sets its final state (no run was started). */
  private async release(
    tx: Prisma.TransactionClient,
    userId: string,
    importId: string,
    prepaid: number,
    state: ImportAiState,
    total: number,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE imports SET ai_state = ${state}, ai_prepaid = 0, ai_total = ${total}::int
      WHERE id = ${importId}::uuid AND user_id = ${userId}::uuid`;
    if (prepaid > 0) {
      await tx.$executeRaw`
        UPDATE ai_settings SET backfill_used = GREATEST(backfill_used - ${prepaid}::int, 0)
        WHERE user_id = ${userId}::uuid`;
    }
  }

  /**
   * The daily sweep (every user, ADR 0056): gives back units nobody used within the open window
   * of an import. (a) An import that asked for the pass, never got a state (the tab closed before
   * `finish`) and holds prepaid units: units back, `ai_prepaid` 0, state `skipped`. (b) Pending
   * grouping units (`ai_settings.import_ai_prepaid`) older than the window: units back, token
   * cleared. One transaction per user, the settings row first (the lock order of `begin`).
   * Answers how many users were touched.
   */
  async expireStranded(): Promise<number> {
    const users = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT user_id AS "userId" FROM imports
      WHERE ai_requested AND ai_state IS NULL AND ai_prepaid > 0
        AND created_at < now() - make_interval(hours => ${IMPORT_LIMIT.OpenHours}::int)
      UNION
      SELECT user_id FROM ai_settings
      WHERE import_ai_prepaid > 0
        AND import_ai_prepaid_at < now() - make_interval(hours => ${IMPORT_LIMIT.OpenHours}::int)
      LIMIT ${AI_CATCH_UP_LIMIT.SweepUsersMax}`;
    let touched = 0;
    for (const { userId } of users) {
      const changed = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM ai_settings WHERE user_id = ${userId}::uuid FOR UPDATE`;
        const stale = await tx.$queryRaw<{ id: string; prepaid: number }[]>`
          SELECT id, ai_prepaid AS prepaid FROM imports
          WHERE user_id = ${userId}::uuid AND ai_requested AND ai_state IS NULL AND ai_prepaid > 0
            AND created_at < now() - make_interval(hours => ${IMPORT_LIMIT.OpenHours}::int)
          FOR UPDATE`;
        for (const row of stale) {
          await this.release(tx, userId, row.id, row.prepaid, IMPORT_AI_STATE.Skipped, 0);
        }
        const pending = await tx.$executeRaw`
          UPDATE ai_settings
          SET backfill_used = GREATEST(backfill_used - import_ai_prepaid, 0), import_ai_prepaid = 0,
            import_ai_grouping_id = NULL, import_ai_prepaid_at = NULL
          WHERE user_id = ${userId}::uuid AND import_ai_prepaid > 0
            AND import_ai_prepaid_at < now() - make_interval(hours => ${IMPORT_LIMIT.OpenHours}::int)`;
        return stale.length > 0 || pending > 0;
      });
      if (changed) touched += 1;
    }
    if (touched > 0) this.logger.log(`Import AI sweep: units given back for ${touched} user(s)`);
    return touched;
  }
}
