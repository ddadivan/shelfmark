import { Injectable, Logger } from '@nestjs/common';
import { DEMO_LIMIT } from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_CLEANUP_LIMITS } from './models/demo-cleanup-limits.const';
import type { DemoCleanupOptions } from './models/demo-cleanup-options.interface';
import type { DemoCleanupResponse } from './models/demo-cleanup-response.interface';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Deletes expired demo users (ADR 0034). The foreign keys cascade, so one user delete removes the
 * sessions, accounts, folders, links, tags and link-tag rows. Batches keep each statement small; the
 * time budget keeps one run inside the function limit, and `hasMore` tells the next run to continue.
 * Idempotent: a second run finds nothing. Only `is_demo` rows can ever match.
 */
@Injectable()
export class DemoCleanupService {
  private readonly logger = new Logger(DemoCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(options: DemoCleanupOptions = {}): Promise<DemoCleanupResponse> {
    const batchSize = options.batchSize ?? DEMO_CLEANUP_LIMITS.BatchSize;
    const budgetMs = options.budgetMs ?? DEMO_CLEANUP_LIMITS.BudgetMs;
    const started = Date.now();
    let deleted = 0;
    let hasMore = false;

    for (;;) {
      const now = new Date();
      // Expired, or (defence in depth, the database check forbids it) a demo user that never got an
      // expiry and is older than the session limit.
      const expired = {
        isDemo: true,
        OR: [
          { demoExpiresAt: { lte: now } },
          {
            demoExpiresAt: null,
            createdAt: { lt: new Date(now.getTime() - DEMO_LIMIT.SessionHours * MS_PER_HOUR) },
          },
        ],
      };
      const batch = await this.prisma.user.findMany({
        where: expired,
        orderBy: { demoExpiresAt: 'asc' },
        take: batchSize,
        select: { id: true },
      });
      if (batch.length === 0) break;
      // The predicate is checked again at delete time: a row that changed since the read is kept.
      const result = await this.prisma.user.deleteMany({
        where: { id: { in: batch.map((user) => user.id) }, ...expired },
      });
      deleted += result.count;
      // Nothing deleted although rows were read: they changed meanwhile; stop instead of spinning.
      if (result.count === 0) break;
      if (batch.length < batchSize) break;
      if (Date.now() - started >= budgetMs) {
        hasMore = (await this.prisma.user.count({ where: expired, take: 1 })) > 0;
        break;
      }
    }
    // The count only: no ids, names or emails.
    this.logger.log(`Demo cleanup deleted ${deleted} user(s), hasMore=${hasMore}`);
    return { deleted, hasMore };
  }
}
