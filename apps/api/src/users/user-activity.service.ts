import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** `YYYY-MM-DD` of the UTC day of `now`. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Records the UTC day of a user's last authenticated request in `users.last_active_on` (ADR 0045):
 * one date, no time, page or action. `SessionAuthGuard` calls `touch` for every non-demo session
 * without waiting for it. Per instance, a user is written at most once per UTC day (the set is
 * dropped when the day changes, so it never grows past one day's users); the conditional update
 * skips the write when another instance already did it. Plain SQL, so `updated_at` stays. A
 * failure is logged without the user and never reaches the request; the next request retries.
 */
@Injectable()
export class UserActivityService {
  private readonly logger = new Logger(UserActivityService.name);
  private day = '';
  private readonly seen = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  /** Never rejects. Resolves once the write is done (or skipped). */
  async touch(userId: string, now: Date = new Date()): Promise<void> {
    const today = utcDay(now);
    if (today !== this.day) {
      this.day = today;
      this.seen.clear();
    }
    if (this.seen.has(userId)) return;
    this.seen.add(userId);
    try {
      await this.prisma.$executeRaw`
        UPDATE users
        SET last_active_on = ${today}::date
        WHERE id = ${userId}::uuid AND is_demo = false
          AND last_active_on IS DISTINCT FROM ${today}::date`;
    } catch {
      if (this.day === today) this.seen.delete(userId);
      this.logger.warn('Could not record the activity day');
    }
  }
}
