import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ACCOUNT_PURGE_LIMITS } from './models/account-purge-limits.const';
import type { AccountPurgeOptions } from './models/account-purge-options.interface';
import type { AccountPurgeResponse } from './models/account-purge-response.interface';

/**
 * Deletes accounts whose grace period is over (`GET /api/cron/account-purge`, Shelf 05-settings),
 * the way the immediate delete did: per account in one transaction, `Verification` rows whose
 * `identifier` equals the email (case-insensitive) and the `User` row, which cascades to every
 * table of the user. Accounts are picked with `FOR UPDATE SKIP LOCKED` and the delete checks the
 * time again, so a "Keep my account" that commits first wins. Batches and a time budget keep one
 * run inside the function limit (`hasMore`). Logs carry counts and user ids only.
 */
@Injectable()
export class AccountPurgeService {
  private readonly logger = new Logger(AccountPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(options: AccountPurgeOptions = {}): Promise<AccountPurgeResponse> {
    const batchSize = options.batchSize ?? ACCOUNT_PURGE_LIMITS.BatchSize;
    const budgetMs = options.budgetMs ?? ACCOUNT_PURGE_LIMITS.BudgetMs;
    const now = options.now ?? new Date();
    const started = Date.now();
    let deleted = 0;
    let hasMore = false;
    for (;;) {
      const count = await this.purgeBatch(now, batchSize);
      deleted += count;
      if (count < batchSize) break;
      if (Date.now() - started >= budgetMs) {
        hasMore =
          (await this.prisma.user.count({ where: { deletionScheduledAt: { lte: now } } })) > 0;
        break;
      }
    }
    this.logger.log(`Account purge deleted ${deleted} account(s), hasMore=${hasMore}`);
    return { deleted, hasMore };
  }

  private purgeBatch(now: Date, batchSize: number): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const picked = await tx.$queryRaw<{ id: string; email: string }[]>`
          SELECT id::text AS id, email FROM users
          WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= ${now}::timestamptz
          ORDER BY deletion_scheduled_at
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED`;
        let count = 0;
        for (const user of picked) {
          await tx.verification.deleteMany({
            where: { identifier: { equals: user.email, mode: 'insensitive' } },
          });
          const result = await tx.user.deleteMany({
            where: { id: user.id, deletionScheduledAt: { lte: now } },
          });
          if (result.count > 0) {
            count += 1;
            this.logger.log(`Account deleted: ${user.id}`);
          }
        }
        return count;
      },
      { timeout: ACCOUNT_PURGE_LIMITS.BudgetMs, maxWait: ACCOUNT_PURGE_LIMITS.BudgetMs },
    );
  }
}
