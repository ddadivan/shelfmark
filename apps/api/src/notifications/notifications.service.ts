import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  NOTIFICATION_ERROR_MESSAGE,
  NOTIFICATION_LIMIT,
  type AddNotificationDeviceRequest,
  type AddNotificationDeviceResponse,
  type NotificationDevice,
  type NotificationSettings,
  type NotificationSettingsResponse,
  type UpdateNotificationSettings,
} from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { PUSH_CONFIG } from './models/push-config.token';
import type { PushConfig } from './models/push-config.interface';

/** Advisory lock per user around the device cap (never taken with another lock). */
const DEVICE_LOCK_PREFIX = 'push-devices:';

const SETTINGS_SELECT = {
  notifyReminders: true,
  notifyContinueReading: true,
  quietFrom: true,
  quietTo: true,
} as const;

/** The answered shape of a device: never the endpoint or keys. */
function toDevice(row: {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}): NotificationDevice {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

/**
 * Settings › Notifications of the session user (Shelf 05-settings / 12-notify): what may be sent,
 * the quiet hours and the devices with Web Push on. Every statement is on the session `userId`; a
 * foreign or missing device is 404. Endpoints and keys are stored but never answered or logged.
 * Push only: there is no email setting (postponed by the author).
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_CONFIG) private readonly config: PushConfig,
  ) {}

  async get(userId: string): Promise<NotificationSettingsResponse> {
    const [row, devices] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: SETTINGS_SELECT }),
      this.prisma.pushSubscription.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, createdAt: true, lastUsedAt: true },
      }),
    ]);
    if (!row) throw new NotFoundException();
    const settings: NotificationSettings = {
      reminders: row.notifyReminders,
      continueReading: row.notifyContinueReading,
      quietFrom: row.quietFrom,
      quietTo: row.quietTo,
    };
    return {
      available: this.config.vapid !== null,
      publicKey: this.config.vapid?.publicKey ?? null,
      settings,
      devices: devices.map(toDevice),
    };
  }

  /**
   * Saves the changed fields. Quiet hours are a pair: after the change both bounds must be set or
   * both `null` (one statement checks it against the stored row; the CHECK is the last guard).
   */
  async update(
    userId: string,
    change: UpdateNotificationSettings,
  ): Promise<NotificationSettingsResponse> {
    if (change.quietFrom !== undefined || change.quietTo !== undefined) {
      const row = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { quietFrom: true, quietTo: true },
      });
      if (!row) throw new NotFoundException();
      const from = change.quietFrom === undefined ? row.quietFrom : change.quietFrom;
      const to = change.quietTo === undefined ? row.quietTo : change.quietTo;
      if ((from === null) !== (to === null)) {
        throw new BadRequestException(NOTIFICATION_ERROR_MESSAGE.QuietHoursPair);
      }
    }
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: {
        notifyReminders: change.reminders,
        notifyContinueReading: change.continueReading,
        quietFrom: change.quietFrom,
        quietTo: change.quietTo,
      },
    });
    return this.get(userId);
  }

  /**
   * Stores this browser's push subscription (or refreshes the keys, name and zone of the same
   * endpoint) under the per-user lock, so the cap of `DevicesPerUserMax` cannot be raced. 503 while
   * Web Push is not configured: a subscription made with no key would be useless.
   */
  async addDevice(
    userId: string,
    body: AddNotificationDeviceRequest,
  ): Promise<AddNotificationDeviceResponse> {
    if (this.config.vapid === null) {
      throw new ServiceUnavailableException(NOTIFICATION_ERROR_MESSAGE.NotConfigured);
    }
    const deviceId = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${DEVICE_LOCK_PREFIX + userId}, 0))`;
      const data = {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        name: body.name,
        timeZone: body.timeZone,
      };
      const existing = await tx.pushSubscription.findUnique({
        where: { userId_endpoint: { userId, endpoint: body.endpoint } },
        select: { id: true },
      });
      if (existing) {
        await tx.pushSubscription.update({ where: { id: existing.id }, data });
        return existing.id;
      }
      const count = await tx.pushSubscription.count({ where: { userId } });
      if (count >= NOTIFICATION_LIMIT.DevicesPerUserMax) {
        throw new ConflictException(NOTIFICATION_ERROR_MESSAGE.DeviceLimit);
      }
      const created = await tx.pushSubscription.create({
        data: { userId, endpoint: body.endpoint, ...data },
        select: { id: true },
      });
      return created.id;
    });
    return { ...(await this.get(userId)), deviceId };
  }

  /** One device of the session user (never its endpoint or keys); foreign or missing is 404. */
  async getDevice(userId: string, id: string): Promise<NotificationDevice> {
    const device = await this.prisma.pushSubscription.findFirst({
      where: { id, userId },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    });
    if (!device) throw new NotFoundException(NOTIFICATION_ERROR_MESSAGE.DeviceNotFound);
    return toDevice(device);
  }

  async removeDevice(userId: string, id: string): Promise<NotificationSettingsResponse> {
    const { count } = await this.prisma.pushSubscription.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException(NOTIFICATION_ERROR_MESSAGE.DeviceNotFound);
    return this.get(userId);
  }
}
