import { Module } from '@nestjs/common';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { PUSH_CONFIG } from './models/push-config.token';
import { PUSH_SENDER } from './models/push-sender.token';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsCronController } from './notifications-cron.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { readPushConfig } from './push/push-config';
import { WebPushSender } from './push/web-push.sender';

/** Settings › Notifications and Web Push delivery (Shelf 12-notify). Push only, no email. */
@Module({
  controllers: [NotificationsController, NotificationsCronController],
  providers: [
    NotificationsService,
    NotificationDeliveryService,
    CronSecretGuard,
    // Read at DI time, never at import time; specs override it.
    { provide: PUSH_CONFIG, useFactory: () => readPushConfig() },
    { provide: PUSH_SENDER, useClass: WebPushSender },
  ],
})
export class NotificationsModule {}
