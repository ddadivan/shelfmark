import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLEANUP_STATE, type CleanupState } from '@shelfmark/contracts';
import { AiBackgroundService } from '../ai/background/ai-background.service';
import type { CleanupTickHook } from '../ai/models/cleanup-tick-hook.interface';
import { AiSettingsService } from '../ai/settings/ai-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { finishFindings } from './finish-findings';
import { CLEANUP_CHECKS } from './models/cleanup-checks.token';
import { CLEANUP_RUN_LIMIT } from './models/cleanup-run-limit.const';
import type { CleanupCheck } from './models/cleanup-check.interface';
import type { CleanupCheckContext } from './models/cleanup-check-context.interface';
import type { StoredCleanupFindings } from './models/stored-cleanup-findings.interface';
import { readStoredFindings, toFindingsJson } from './read-stored-findings';
import { toCleanupState } from './to-cleanup-state';

/**
 * The deferred clean-up pass (ADR 0052 point 3). Started after a run with AI checks, continued by the
 * AI tick while the report is `running` (`CleanupTickHook`) and by the daily sweep. One instance at a
 * time per user: a `LeaseMs` lease on the report row, renewed after every step and checked by its
 * exact value, so a lost lease, a new run or "Delete AI data" stops the pass. Each step stores the
 * findings (ids only), the cursor and `progress_at`; a run without progress for `StallHours` becomes
 * `failed` with what it found. Logs carry counts and durations only.
 */
@Injectable()
export class CleanupRunnerService implements CleanupTickHook {
  private readonly logger = new Logger(CleanupRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly background: AiBackgroundService,
    @Inject(CLEANUP_CHECKS) private readonly checks: readonly CleanupCheck[],
  ) {}

  /** Defers a pass for the user with the run budget. */
  start(userId: string): void {
    const deadline = Date.now() + CLEANUP_RUN_LIMIT.BudgetMs;
    this.background.defer(() => this.continue(userId, deadline));
  }

  /** The tick: answers the report state and continues a `running` report whose lease is free. */
  async tick(userId: string): Promise<CleanupState> {
    const row = await this.prisma.cleanupReport.findUnique({
      where: { userId },
      select: { state: true, leaseUntil: true },
    });
    const state = toCleanupState(row?.state);
    const free = row?.leaseUntil == null || row.leaseUntil.getTime() < Date.now();
    if (state === CLEANUP_STATE.Running && free) this.start(userId);
    return state;
  }

  /**
   * The daily sweep (every user's rows, like the AI sweep): stalled runs fail with their findings,
   * then abandoned running reports (lease free) are continued within the deadline.
   */
  async sweep(deadline: number): Promise<void> {
    const stalled = await this.prisma.$queryRaw<{ userId: string; findings: unknown }[]>`
      SELECT user_id::text AS "userId", findings FROM cleanup_reports
      WHERE state = ${CLEANUP_STATE.Running}
        AND (progress_at IS NULL
          OR progress_at < now() - make_interval(hours => ${CLEANUP_RUN_LIMIT.StallHours}))
      LIMIT ${CLEANUP_RUN_LIMIT.SweepReportsMax}`;
    for (const row of stalled) {
      const findings = finishFindings(readStoredFindings(row.findings));
      await this.prisma.$executeRaw`
        UPDATE cleanup_reports
        SET state = ${CLEANUP_STATE.Failed}, findings = ${JSON.stringify(toFindingsJson(findings))}::jsonb,
          lease_until = NULL, cursor = NULL, finished_at = now()
        WHERE user_id = ${row.userId}::uuid AND state = ${CLEANUP_STATE.Running}`;
    }
    const abandoned = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT user_id::text AS "userId" FROM cleanup_reports
      WHERE state = ${CLEANUP_STATE.Running} AND (lease_until IS NULL OR lease_until < now())
      ORDER BY progress_at
      LIMIT ${CLEANUP_RUN_LIMIT.SweepReportsMax}`;
    let errors = 0;
    for (const { userId } of abandoned) {
      if (Date.now() >= deadline) break;
      await this.continue(userId, deadline).catch(() => {
        errors += 1;
      });
    }
    if (stalled.length > 0 || abandoned.length > 0 || errors > 0) {
      this.logger.log(
        `Clean-up sweep: ${stalled.length} failed, ${abandoned.length} continued, ${errors} error(s)`,
      );
    }
  }

  /** Runs the pending checks of the user's running report until done or the deadline. */
  async continue(userId: string, deadline: number): Promise<void> {
    const started = Date.now();
    let lease = this.nextLease();
    const [row] = await this.prisma.$queryRaw<
      { findings: unknown; cursor: string | null; checked: number; isDemo: boolean }[]
    >`
      UPDATE cleanup_reports AS r SET lease_until = ${lease}
      FROM users u
      WHERE r.user_id = ${userId}::uuid AND u.id = r.user_id AND r.state = ${CLEANUP_STATE.Running}
        AND (r.lease_until IS NULL OR r.lease_until < now())
      RETURNING r.findings, r.cursor::text AS cursor, r.checked, u.is_demo AS "isDemo"`;
    if (row === undefined) return;
    const ctx: CleanupCheckContext = {
      db: this.prisma,
      userId,
      isDemo: row.isDemo,
      findings: readStoredFindings(row.findings),
      cursor: row.cursor,
      checked: row.checked,
    };
    // AI turned off meanwhile: the AI checks are dropped and the report completes with the rest.
    const stored = await this.settings.read(this.prisma, userId);
    if (!stored.settings.enabled) ctx.findings.pending = [];
    try {
      while (ctx.findings.pending.length > 0 && Date.now() < deadline) {
        const key = ctx.findings.pending[0];
        const check = this.checks.find((entry) => entry.key === key);
        const progress =
          check === undefined
            ? { done: true, cursor: null, checked: ctx.checked }
            : await check.run(ctx, deadline);
        ctx.checked = progress.checked;
        ctx.cursor = progress.done ? null : progress.cursor;
        if (progress.done) ctx.findings.pending.shift();
        const next = this.nextLease();
        if (!(await this.save(userId, lease, next, ctx))) return;
        lease = next;
      }
      if (ctx.findings.pending.length === 0) {
        await this.finish(userId, lease, finishFindings(ctx.findings));
        this.logger.log(`Clean-up pass finished in ${Date.now() - started} ms`);
      } else {
        await this.release(userId, lease);
      }
    } catch (error) {
      await this.release(userId, lease);
      throw error;
    }
  }

  private nextLease(): Date {
    return new Date(Date.now() + CLEANUP_RUN_LIMIT.LeaseMs);
  }

  /** Stores one step while the lease is still ours; `false` when it is not (the pass stops). */
  private async save(
    userId: string,
    lease: Date,
    next: Date,
    ctx: CleanupCheckContext,
  ): Promise<boolean> {
    const updated = await this.prisma.$executeRaw`
      UPDATE cleanup_reports
      SET findings = ${JSON.stringify(toFindingsJson(ctx.findings))}::jsonb, cursor = ${ctx.cursor}::uuid,
        checked = ${ctx.checked}, progress_at = now(), lease_until = ${next}
      WHERE user_id = ${userId}::uuid AND state = ${CLEANUP_STATE.Running} AND lease_until = ${lease}`;
    return updated > 0;
  }

  private async finish(
    userId: string,
    lease: Date,
    findings: StoredCleanupFindings,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE cleanup_reports
      SET state = ${CLEANUP_STATE.Ready}, findings = ${JSON.stringify(toFindingsJson(findings))}::jsonb,
        cursor = NULL, lease_until = NULL, progress_at = now(), finished_at = now()
      WHERE user_id = ${userId}::uuid AND state = ${CLEANUP_STATE.Running} AND lease_until = ${lease}`;
  }

  private async release(userId: string, lease: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE cleanup_reports SET lease_until = NULL
      WHERE user_id = ${userId}::uuid AND lease_until = ${lease}`;
  }
}
