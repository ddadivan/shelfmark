import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TRASH_CLEANUP_LIMITS } from './models/trash-cleanup-limits.const';
import type { TrashCleanupOptions } from './models/trash-cleanup-options.interface';
import type { TrashCleanupResponse } from './models/trash-cleanup-response.interface';

/**
 * Purges Trash rows older than their owner's retention (ADR 0036 point 6): links first, then
 * folders (a folder takes its subfolders by cascade; the links deleted with it share its
 * timestamp, so they are already gone). Batches keep each statement small; the budget keeps one
 * run inside the function limit and `hasMore` tells the next run to continue. All rows are
 * measured against one `now` taken at the start, so a folder and the links deleted with it expire
 * in the same run. Idempotent. Nothing is logged but counts.
 */
@Injectable()
export class TrashCleanupService {
  private readonly logger = new Logger(TrashCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(options: TrashCleanupOptions = {}): Promise<TrashCleanupResponse> {
    const batchSize = options.batchSize ?? TRASH_CLEANUP_LIMITS.BatchSize;
    const budgetMs = options.budgetMs ?? TRASH_CLEANUP_LIMITS.BudgetMs;
    const now = options.now ?? new Date();
    const started = Date.now();
    let deleted = 0;
    let hasMore = false;

    const batches = [
      (): Promise<number> => this.purgeLinks(now, batchSize),
      (): Promise<number> => this.purgeFolders(now, batchSize),
    ];
    outer: for (const purge of batches) {
      for (;;) {
        const count = await purge();
        deleted += count;
        if (count < batchSize) break;
        if (Date.now() - started >= budgetMs) {
          hasMore = await this.anyExpired(now);
          break outer;
        }
      }
    }
    this.logger.log(`Trash cleanup deleted ${deleted} row(s), hasMore=${hasMore}`);
    return { deleted, hasMore };
  }

  /**
   * The rows are picked with `FOR UPDATE SKIP LOCKED`, so a row a restore (or another purge run)
   * holds is skipped instead of waited for (no deadlock between overlapping runs), and the DELETE
   * checks `deleted_at` and the cutoff again, so a row restored after the pick is kept.
   */
  private purgeLinks(now: Date, batchSize: number): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM links l USING users u
      WHERE u.id = l.user_id
        AND l.id IN (
          SELECT l2.id FROM links l2 JOIN users u2 ON u2.id = l2.user_id
          WHERE l2.deleted_at IS NOT NULL
            AND l2.deleted_at < ${now}::timestamptz - make_interval(days => u2.trash_retention_days::int)
          ORDER BY l2.deleted_at
          LIMIT ${batchSize}
          FOR UPDATE OF l2 SKIP LOCKED)
        AND l.deleted_at IS NOT NULL
        AND l.deleted_at < ${now}::timestamptz - make_interval(days => u.trash_retention_days::int)`;
  }

  /**
   * Same locking as links. A folder takes its subfolders by cascade, so subfolders trashed on their
   * own (another `deleted_at`, their own Trash entry) are detached to the top level first.
   */
  private purgeFolders(now: Date, batchSize: number): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const picked = await tx.$queryRaw<{ id: string }[]>`
          SELECT f.id::text AS id FROM folders f JOIN users u ON u.id = f.user_id
          WHERE f.deleted_at IS NOT NULL
            AND f.deleted_at < ${now}::timestamptz - make_interval(days => u.trash_retention_days::int)
          ORDER BY f.deleted_at
          LIMIT ${batchSize}
          FOR UPDATE OF f SKIP LOCKED`;
        if (picked.length === 0) return 0;
        const ids = picked.map((row) => row.id);
        await tx.$executeRaw`
          UPDATE folders c SET parent_id = NULL
          FROM folders p
          WHERE p.id = ANY(${ids}::uuid[]) AND c.parent_id = p.id AND c.user_id = p.user_id
            AND c.deleted_at IS DISTINCT FROM p.deleted_at`;
        return tx.$executeRaw`
          DELETE FROM folders f USING users u
          WHERE u.id = f.user_id AND f.id = ANY(${ids}::uuid[])
            AND f.deleted_at IS NOT NULL
            AND f.deleted_at < ${now}::timestamptz - make_interval(days => u.trash_retention_days::int)`;
      },
      { timeout: TRASH_CLEANUP_LIMITS.BudgetMs, maxWait: TRASH_CLEANUP_LIMITS.BudgetMs },
    );
  }

  private async anyExpired(now: Date): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ found: boolean }[]>`
      SELECT (
        EXISTS (
          SELECT 1 FROM links l JOIN users u ON u.id = l.user_id
          WHERE l.deleted_at IS NOT NULL
            AND l.deleted_at < ${now}::timestamptz - make_interval(days => u.trash_retention_days::int))
        OR EXISTS (
          SELECT 1 FROM folders f JOIN users u ON u.id = f.user_id
          WHERE f.deleted_at IS NOT NULL
            AND f.deleted_at < ${now}::timestamptz - make_interval(days => u.trash_retention_days::int))
      ) AS found`;
    return rows[0]?.found === true;
  }
}
