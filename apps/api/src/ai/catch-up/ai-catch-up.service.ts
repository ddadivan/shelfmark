import { Injectable, Logger } from '@nestjs/common';
import { AI_BACKFILL_STATE, AI_JOB_REASON, type AiTickResponse } from '@shelfmark/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { AiBackfillResultsService } from '../backfill/ai-backfill-results.service';
import { AiBackfillService } from '../backfill/ai-backfill.service';
import { AiBackgroundService } from '../background/ai-background.service';
import { AI_BATCH_STATE } from '../models/ai-batch-state.const';
import { AI_CATCH_UP_LIMIT } from '../models/ai-catch-up-limit.const';
import { AI_JOB_STATE } from '../models/ai-job-state.const';
import { AI_RUNNER_LIMIT } from '../models/ai-runner-limit.const';
import type { AiSweepResponse } from '../models/ai-sweep-response.interface';
import { AiRunnerService } from '../runner/ai-runner.service';
import { AiSettingsService } from '../settings/ai-settings.service';

/**
 * Catch-up without frequent crons (ADR 0048 point 4). `tick` (the session user, while the web app
 * has pending jobs or a running backfill) and the daily `sweep` (every user with work) answer at once
 * and run the work after the response within their budget: poll open batches, run stale jobs
 * (pending past 30 s or a lease that expired; drafts not yet attached are left to their dialog),
 * advance the backfill. The sweep also fails jobs whose attempts are used up and deletes unattached
 * drafts older than a day. Logs carry counts only.
 */
@Injectable()
export class AiCatchUpService {
  private readonly logger = new Logger(AiCatchUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly runner: AiRunnerService,
    private readonly backfill: AiBackfillService,
    private readonly backfillResults: AiBackfillResultsService,
    private readonly background: AiBackgroundService,
  ) {}

  /** `POST /api/ai/tick`: starts the user's catch-up and answers the progress as it is now. */
  async tick(userId: string): Promise<AiTickResponse> {
    const deadline = Date.now() + AI_CATCH_UP_LIMIT.TickBudgetMs;
    this.background.defer(() => this.catchUp(userId, deadline));
    return this.settings.progress(userId);
  }

  /** `GET /api/cron/ai-sweep` (no session: the only AI code that touches every user's rows). */
  async sweep(): Promise<AiSweepResponse> {
    const failed = await this.failExhausted();
    const deletedDrafts = await this.prisma.$executeRaw`
      DELETE FROM ai_jobs
      WHERE link_id IS NULL AND draft_id IS NOT NULL
        AND created_at < now() - make_interval(hours => ${AI_CATCH_UP_LIMIT.DraftMaxAgeHours})`;
    const users = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT user_id AS "userId" FROM ai_jobs
      WHERE link_id IS NOT NULL AND batch_id IS NULL
        AND status IN (${AI_JOB_STATE.Pending}, ${AI_JOB_STATE.Running})
      UNION
      SELECT user_id FROM ai_batches WHERE status = ${AI_BATCH_STATE.Submitted}
      UNION
      SELECT user_id FROM ai_settings WHERE backfill_state = ${AI_BACKFILL_STATE.Running}
      LIMIT ${AI_CATCH_UP_LIMIT.SweepUsersMax}`;
    const deadline = Date.now() + AI_CATCH_UP_LIMIT.SweepBudgetMs;
    this.background.defer(async () => {
      let errors = 0;
      for (const { userId } of users) {
        if (Date.now() >= deadline) break;
        await this.catchUp(userId, deadline).catch(() => {
          errors += 1;
        });
      }
      if (errors > 0) this.logger.warn(`AI sweep: catch-up failed for ${errors} user(s)`);
    });
    if (failed > 0 || deletedDrafts > 0) {
      this.logger.log(`AI sweep: ${failed} job(s) failed, ${deletedDrafts} draft(s) deleted`);
    }
    return { failed, deletedDrafts, users: users.length };
  }

  /** One user's catch-up within the deadline. */
  async catchUp(userId: string, deadline: number): Promise<void> {
    await this.backfillResults.poll(userId, deadline);
    const stale = await this.staleJobs(userId);
    if (stale.length > 0) await this.runner.runMany(userId, stale, deadline - Date.now());
    await this.backfill.advance(userId, deadline);
  }

  /** Saved-link jobs of the user that should have run by now (claimable, outside a batch). */
  private async staleJobs(userId: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM ai_jobs
      WHERE user_id = ${userId}::uuid AND link_id IS NOT NULL AND batch_id IS NULL
        AND attempts < ${AI_RUNNER_LIMIT.MaxAttempts}
        AND (
          (status = ${AI_JOB_STATE.Pending} AND (
            (not_before IS NULL
              AND updated_at < now() - make_interval(secs => ${AI_CATCH_UP_LIMIT.StaleAfterSeconds}))
            OR not_before <= now()
          ))
          OR (status = ${AI_JOB_STATE.Running} AND lease_until < now())
        )
      ORDER BY created_at
      LIMIT ${AI_CATCH_UP_LIMIT.StaleJobsPerUser}`;
    return rows.map((row) => row.id);
  }

  /**
   * Fails for good what can never run again: attempts used up (pending, or running with an expired
   * lease after the instance was killed) and jobs left running in a batch that is no longer open.
   */
  private async failExhausted(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      WITH failed AS (
        UPDATE ai_jobs
        SET status = ${AI_JOB_STATE.Failed}, reason = ${AI_JOB_REASON.Unavailable},
          lease_until = NULL, not_before = NULL, result = NULL, updated_at = now()
        WHERE (status = ${AI_JOB_STATE.Pending} AND attempts >= ${AI_RUNNER_LIMIT.MaxAttempts})
          OR (status = ${AI_JOB_STATE.Running} AND attempts >= ${AI_RUNNER_LIMIT.MaxAttempts}
            AND lease_until < now())
          OR (status = ${AI_JOB_STATE.Running} AND batch_id IN (
            SELECT id FROM ai_batches WHERE status <> ${AI_BATCH_STATE.Submitted}))
        RETURNING user_id, link_id
      ), marked AS (
        UPDATE links AS l SET ai_status = ${AI_JOB_STATE.Failed}
        FROM failed AS f
        WHERE l.id = f.link_id AND l.user_id = f.user_id
        RETURNING 1
      )
      SELECT count(*)::int AS n FROM failed`;
    return rows[0]?.n ?? 0;
  }
}
