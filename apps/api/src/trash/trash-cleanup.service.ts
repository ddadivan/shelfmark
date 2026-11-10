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

  private purgeLinks(now: Date, batchSize: number): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM links WHERE id IN (
        SELECT l.id FROM links l JOIN users u ON u.id = l.user_id
        WHERE l.deleted_at IS NOT NULL
          AND l.deleted_at < ${now}::timestamptz - make_interval(days => u.trash_retention_days::int)
        ORDER BY l.deleted_at
        LIMIT ${batchSize})`;
  }

  private purgeFolders(now: Date, batchSize: number): Promise<number> {
    return this.prisma.$executeRaw`
      DELETE FROM folders WHERE id IN (
        SELECT f.id FROM folders f JOIN users u ON u.id = f.user_id
        WHERE f.deleted_at IS NOT NULL
          AND f.deleted_at < ${now}::timestamptz - make_interval(days => u.trash_retention_days::int)
        ORDER BY f.deleted_at
        LIMIT ${batchSize})`;
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
