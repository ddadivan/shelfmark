import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { NOTIFICATION_ERROR_MESSAGE, type NotificationTestResponse } from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_DELIVERY_LIMIT } from './models/notification-delivery-limit.const';
import { PUSH_CONFIG } from './models/push-config.token';
import { PUSH_SEND_STATUS } from './models/push-send-status.const';
import { PUSH_SENDER } from './models/push-sender.token';
import type { NotificationDeliveryOptions } from './models/notification-delivery-options.interface';
import type { NotificationDeliveryResponse } from './models/notification-delivery-response.interface';
import type { PushConfig } from './models/push-config.interface';
import type { PushMessage } from './models/push-message.interface';
import type { PushSender } from './models/push-sender.interface';
import type { VapidKeys } from './models/vapid-keys.interface';
import { reminderMessage, remindersSummaryMessage, testMessage } from './push/build-push-message';
import { isQuietAt } from './push/quiet-hours';

interface DeviceRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timeZone: string;
}

interface SendTally {
  sent: number;
  removed: number;
}

/**
 * Web Push delivery (Shelf 12-notify). `run` is the cron (`GET /api/cron/notifications`, the only
 * cross-user reader here, a Vercel Schedule every 15 minutes): users with reminders on, at least one
 * device and reminders that became due in the last `DueWindowHours` and were not pushed for their
 * current `remind_at`; per user the devices outside their quiet hours (each in its own time zone)
 * get up to `SinglePushesMax` messages one by one or one summary. Idempotent: the reminders are
 * claimed first by one conditional UPDATE ... RETURNING (`remind_pushed_at`), so two overlapping runs
 * or a repeated delivery of the same schedule occurrence never push a reminder twice; a claim whose
 * push no service accepted is released again. Reminders older than the window (an outage) are not
 * pushed but marked handled (`skipped`), so they are never retried (they stay in Today). A 404 / 410
 * deletes the device. Batches and a time budget keep one run inside the function limit. Nothing is
 * done while the VAPID keys are missing. Logs carry counts and the schedule execution id only.
 */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_CONFIG) private readonly config: PushConfig,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  async run(options: NotificationDeliveryOptions = {}): Promise<NotificationDeliveryResponse> {
    const vapid = this.config.vapid;
    if (vapid === null) {
      return { configured: false, sent: 0, removed: 0, quiet: 0, skipped: 0, hasMore: false };
    }
    const now = options.now ?? new Date();
    const budgetMs = options.budgetMs ?? NOTIFICATION_DELIVERY_LIMIT.BudgetMs;
    const batch = options.usersPerBatch ?? NOTIFICATION_DELIVERY_LIMIT.UsersPerBatch;
    const started = Date.now();
    const done: string[] = [];
    const tally: SendTally = { sent: 0, removed: 0 };
    let quiet = 0;
    let hasMore = false;
    const skipped = await this.skipStale(now);

    outer: for (;;) {
      const users = await this.dueUsers(now, done, batch);
      for (const userId of users) {
        done.push(userId);
        if (!(await this.deliverTo(userId, now, vapid, tally))) quiet += 1;
        if (Date.now() - started >= budgetMs) {
          hasMore = (await this.dueUsers(now, done, 1)).length > 0;
          break outer;
        }
      }
      if (users.length < batch) break;
    }
    this.logger.log(
      `Notifications${options.executionId ? ` [${options.executionId}]` : ''}: sent ${tally.sent}, removed ${tally.removed}, quiet ${quiet}, skipped ${skipped}, hasMore=${hasMore}`,
    );
    return { configured: true, sent: tally.sent, removed: tally.removed, quiet, skipped, hasMore };
  }

  /** "Send a test": a sample to every device of the session user, quiet hours or not. */
  async test(userId: string): Promise<NotificationTestResponse> {
    const vapid = this.config.vapid;
    if (vapid === null) {
      throw new ServiceUnavailableException(NOTIFICATION_ERROR_MESSAGE.NotConfigured);
    }
    const devices = await this.devicesOf(userId);
    const tally: SendTally = { sent: 0, removed: 0 };
    const accepted = await this.sendAll(userId, devices, [testMessage()], vapid, new Date(), tally);
    return { sent: accepted.size };
  }

  /**
   * Reminders that became due before the window (an outage, or the user's quiet hours that long)
   * are not pushed: they are marked handled so no later run picks them up. Only users who would have
   * been pushed (reminders on, a device); one bounded statement per run.
   */
  private async skipStale(now: Date): Promise<number> {
    return this.prisma.$executeRaw`
      UPDATE links SET remind_pushed_at = ${now}::timestamptz
      WHERE id IN (
        SELECT l.id
        FROM links l
        JOIN users u ON u.id = l.user_id
        WHERE l.remind_at IS NOT NULL
          AND l.remind_at <= ${now}::timestamptz - make_interval(hours => ${NOTIFICATION_DELIVERY_LIMIT.DueWindowHours}::int)
          AND (l.remind_pushed_at IS NULL OR l.remind_pushed_at < l.remind_at)
          AND l.deleted_at IS NULL
          AND u.notify_reminders
          AND EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = l.user_id)
        ORDER BY l.remind_at, l.id
        LIMIT ${NOTIFICATION_DELIVERY_LIMIT.SkipPerRunMax}
        FOR UPDATE OF l SKIP LOCKED)
        AND remind_at <= ${now}::timestamptz - make_interval(hours => ${NOTIFICATION_DELIVERY_LIMIT.DueWindowHours}::int)
        AND (remind_pushed_at IS NULL OR remind_pushed_at < remind_at)`;
  }

  /** Users with due, not yet pushed reminders, reminders on and a device; oldest due first. */
  private async dueUsers(now: Date, skip: readonly string[], limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ user_id: string }[]>`
      SELECT l.user_id::text AS user_id
      FROM links l
      JOIN users u ON u.id = l.user_id
      WHERE l.remind_at IS NOT NULL
        AND l.remind_at <= ${now}::timestamptz
        AND l.remind_at > ${now}::timestamptz - make_interval(hours => ${NOTIFICATION_DELIVERY_LIMIT.DueWindowHours}::int)
        AND (l.remind_pushed_at IS NULL OR l.remind_pushed_at < l.remind_at)
        AND l.deleted_at IS NULL
        AND u.notify_reminders
        AND EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = l.user_id)
        AND NOT (l.user_id = ANY(${[...skip]}::uuid[]))
      GROUP BY l.user_id
      ORDER BY min(l.remind_at), l.user_id
      LIMIT ${limit}`;
    return rows.map((row) => row.user_id);
  }

  /** False when every device of the user is in quiet hours (nothing sent, nothing marked). */
  private async deliverTo(
    userId: string,
    now: Date,
    vapid: VapidKeys,
    tally: SendTally,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { quietFrom: true, quietTo: true },
    });
    if (!user) return true;
    const devices = (await this.devicesOf(userId)).filter(
      (device) => !isQuietAt(now, user.quietFrom, user.quietTo, device.timeZone),
    );
    if (devices.length === 0) return false;

    // Claim first (conditional UPDATE ... RETURNING, repeated conditions are re-checked after a wait
    // on a concurrent run's row lock), push afterwards: whoever claims a reminder pushes it.
    const claimed = await this.prisma.$queryRaw<
      { id: string; title: string; url: string; remind_at: Date }[]
    >`
      UPDATE links SET remind_pushed_at = ${now}::timestamptz
      WHERE id IN (
        SELECT l.id
        FROM links l
        WHERE l.user_id = ${userId}::uuid
          AND l.remind_at IS NOT NULL
          AND l.remind_at <= ${now}::timestamptz
          AND l.remind_at > ${now}::timestamptz - make_interval(hours => ${NOTIFICATION_DELIVERY_LIMIT.DueWindowHours}::int)
          AND (l.remind_pushed_at IS NULL OR l.remind_pushed_at < l.remind_at)
          AND l.deleted_at IS NULL
        ORDER BY l.remind_at, l.id
        LIMIT ${NOTIFICATION_DELIVERY_LIMIT.RemindersPerUserMax}
        FOR UPDATE OF l SKIP LOCKED)
        AND user_id = ${userId}::uuid
        AND remind_at IS NOT NULL
        AND remind_at <= ${now}::timestamptz
        AND remind_at > ${now}::timestamptz - make_interval(hours => ${NOTIFICATION_DELIVERY_LIMIT.DueWindowHours}::int)
        AND (remind_pushed_at IS NULL OR remind_pushed_at < remind_at)
        AND deleted_at IS NULL
      RETURNING id::text AS id, title, url, remind_at`;
    if (claimed.length === 0) return true;
    const links = [...claimed].sort(
      (x, y) => x.remind_at.getTime() - y.remind_at.getTime() || x.id.localeCompare(y.id),
    );

    const messages =
      links.length <= NOTIFICATION_DELIVERY_LIMIT.SinglePushesMax
        ? links.map((link) => reminderMessage(link))
        : [remindersSummaryMessage(links.length)];
    let accepted: Set<string>;
    try {
      accepted = await this.sendAll(userId, devices, messages, vapid, now, tally);
    } catch (error) {
      await this.release(userId, links, now);
      throw error;
    }
    if (accepted.size === 0) await this.release(userId, links, now);
    return true;
  }

  /** Gives a claim back (no push service accepted anything): the next run tries again. */
  private async release(
    userId: string,
    links: readonly { id: string }[],
    claimedAt: Date,
  ): Promise<void> {
    const ids = links.map((link) => link.id);
    await this.prisma.$executeRaw`
      UPDATE links SET remind_pushed_at = NULL
      WHERE user_id = ${userId}::uuid AND id = ANY(${ids}::uuid[])
        AND remind_pushed_at = ${claimedAt}::timestamptz`;
  }

  private devicesOf(userId: string): Promise<DeviceRow[]> {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, endpoint: true, p256dh: true, auth: true, timeZone: true },
    });
  }

  /**
   * Every message to every device; answers the ids of the devices that accepted at least one.
   * `last_used_at` is written for those, gone devices are deleted (both on the user's own rows).
   */
  private async sendAll(
    userId: string,
    devices: readonly DeviceRow[],
    messages: readonly PushMessage[],
    vapid: VapidKeys,
    now: Date,
    tally: SendTally,
  ): Promise<Set<string>> {
    const accepted = new Set<string>();
    const gone = new Set<string>();
    for (const device of devices) {
      const target = {
        endpoint: device.endpoint,
        keys: { p256dh: device.p256dh, auth: device.auth },
      };
      for (const message of messages) {
        const status = await this.sender.send(target, message, vapid);
        if (status === PUSH_SEND_STATUS.Sent) {
          accepted.add(device.id);
          tally.sent += 1;
        } else if (status === PUSH_SEND_STATUS.Gone) {
          gone.add(device.id);
          break;
        }
      }
    }
    if (accepted.size > 0) {
      await this.prisma.pushSubscription.updateMany({
        where: { userId, id: { in: [...accepted] } },
        data: { lastUsedAt: now },
      });
    }
    if (gone.size > 0) {
      const { count } = await this.prisma.pushSubscription.deleteMany({
        where: { userId, id: { in: [...gone] } },
      });
      tally.removed += count;
    }
    return accepted;
  }
}
