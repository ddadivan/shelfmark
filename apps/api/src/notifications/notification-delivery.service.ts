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
 * cross-user reader here): users with reminders on, at least one device and reminders that became
 * due in the last `DueWindowHours` and were not pushed for their current `remind_at`; per user the
 * devices outside their quiet hours (each in its own time zone) get up to `SinglePushesMax` messages
 * one by one or one summary; the links are marked pushed only when a push service accepted one.
 * A 404 / 410 deletes the device. Batches and a time budget keep one run inside the function limit.
 * Nothing is done while the VAPID keys are missing. Logs carry counts only.
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
      return { configured: false, sent: 0, removed: 0, quiet: 0, hasMore: false };
    }
    const now = options.now ?? new Date();
    const budgetMs = options.budgetMs ?? NOTIFICATION_DELIVERY_LIMIT.BudgetMs;
    const batch = options.usersPerBatch ?? NOTIFICATION_DELIVERY_LIMIT.UsersPerBatch;
    const started = Date.now();
    const done: string[] = [];
    const tally: SendTally = { sent: 0, removed: 0 };
    let quiet = 0;
    let hasMore = false;

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
      `Notifications: sent ${tally.sent}, removed ${tally.removed}, quiet ${quiet}, hasMore=${hasMore}`,
    );
    return { configured: true, sent: tally.sent, removed: tally.removed, quiet, hasMore };
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

    const links = await this.prisma.$queryRaw<{ id: string; title: string; url: string }[]>`
      SELECT l.id::text AS id, l.title, l.url
      FROM links l
      WHERE l.user_id = ${userId}::uuid
        AND l.remind_at IS NOT NULL
        AND l.remind_at <= ${now}::timestamptz
        AND l.remind_at > ${now}::timestamptz - make_interval(hours => ${NOTIFICATION_DELIVERY_LIMIT.DueWindowHours}::int)
        AND (l.remind_pushed_at IS NULL OR l.remind_pushed_at < l.remind_at)
        AND l.deleted_at IS NULL
      ORDER BY l.remind_at, l.id
      LIMIT ${NOTIFICATION_DELIVERY_LIMIT.RemindersPerUserMax}`;
    if (links.length === 0) return true;

    const messages =
      links.length <= NOTIFICATION_DELIVERY_LIMIT.SinglePushesMax
        ? links.map((link) => reminderMessage(link))
        : [remindersSummaryMessage(links.length)];
    const accepted = await this.sendAll(userId, devices, messages, vapid, now, tally);
    if (accepted.size > 0) {
      const ids = links.map((link) => link.id);
      await this.prisma.$executeRaw`
        UPDATE links SET remind_pushed_at = ${now}::timestamptz
        WHERE user_id = ${userId}::uuid AND id = ANY(${ids}::uuid[])
          AND remind_at IS NOT NULL AND remind_at <= ${now}::timestamptz`;
    }
    return true;
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
