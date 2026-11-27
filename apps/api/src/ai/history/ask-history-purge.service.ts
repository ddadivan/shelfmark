import { Injectable, Logger } from '@nestjs/common';
import { ASK_HISTORY_LIMIT } from '@shelfmark/contracts';
import { runBatchedWithBudget } from '../../common/cron/run-batched-with-budget';
import { PrismaService } from '../../prisma/prisma.service';
import { ASK_HISTORY_PURGE_LIMITS } from '../models/ask-history-purge-limits.const';
import type { AskHistoryPurgeOptions } from '../models/ask-history-purge-options.interface';
import type { AskHistoryPurgeResponse } from '../models/ask-history-purge-response.interface';

const DAY_MS = 86_400_000;

/**
 * `GET /api/cron/ask-history`: deletes Ask conversations whose last turn is older than
 * `ASK_HISTORY_LIMIT.RetentionDays` (turns and link refs cascade), in batches picked with
 * `FOR UPDATE SKIP LOCKED` within a time budget (`hasMore`). One `now` per run. The only Ask history
 * code that reads every user's rows; logs carry counts only.
 */
@Injectable()
export class AskHistoryPurgeService {
  private readonly logger = new Logger(AskHistoryPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(options: AskHistoryPurgeOptions = {}): Promise<AskHistoryPurgeResponse> {
    const batchSize = options.batchSize ?? ASK_HISTORY_PURGE_LIMITS.BatchSize;
    const budgetMs = options.budgetMs ?? ASK_HISTORY_PURGE_LIMITS.BudgetMs;
    const now = options.now ?? new Date();
    const cutoff = new Date(now.getTime() - ASK_HISTORY_LIMIT.RetentionDays * DAY_MS);
    const { processed: deleted, hasMore } = await runBatchedWithBudget({
      batchSize,
      budgetMs,
      step: () => this.purgeBatch(cutoff, batchSize),
      anyLeft: async () =>
        (await this.prisma.askConversation.count({ where: { updatedAt: { lt: cutoff } } })) > 0,
    });
    this.logger.log(`Ask history purge deleted ${deleted} conversation(s), hasMore=${hasMore}`);
    return { deleted, hasMore };
  }

  private async purgeBatch(cutoff: Date, batchSize: number): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const picked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM ask_conversations
        WHERE updated_at < ${cutoff}::timestamptz
        ORDER BY updated_at
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED`;
      if (picked.length === 0) return 0;
      const { count } = await tx.askConversation.deleteMany({
        where: { id: { in: picked.map((row) => row.id) }, updatedAt: { lt: cutoff } },
      });
      return count;
    });
  }
}
