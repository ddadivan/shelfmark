import { Injectable, Logger } from '@nestjs/common';
import webPush from 'web-push';
import { NOTIFICATION_DELIVERY_LIMIT } from '../models/notification-delivery-limit.const';
import { PUSH_SEND_STATUS } from '../models/push-send-status.const';
import type { PushMessage } from '../models/push-message.interface';
import type { PushSendStatus } from '../models/push-send-status.type';
import type { PushSender } from '../models/push-sender.interface';
import type { PushTarget } from '../models/push-target.interface';
import type { VapidKeys } from '../models/vapid-keys.interface';
import { isAllowedPushEndpoint } from './push-endpoint-policy';

/** Push services answer these when a subscription no longer exists (RFC 8030). */
const GONE_STATUSES: readonly number[] = [404, 410];

/**
 * The real `PushSender` (the Web Push outbound exception, `apps/api/CLAUDE.md`): the `web-push`
 * package encrypts the message (RFC 8291) and signs a VAPID JWT (RFC 8292), then makes one HTTPS
 * POST to the subscription endpoint. The endpoint is re-checked against the push service allow-list
 * first; no proxy, a 5 s timeout, no redirects (Node's `https.request` does not follow them). Never
 * throws; logs carry the status code only, never the endpoint, keys or message.
 */
@Injectable()
export class WebPushSender implements PushSender {
  private readonly logger = new Logger(WebPushSender.name);

  async send(target: PushTarget, message: PushMessage, vapid: VapidKeys): Promise<PushSendStatus> {
    if (!isAllowedPushEndpoint(target.endpoint)) {
      return PUSH_SEND_STATUS.Refused;
    }
    try {
      await webPush.sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.keys.p256dh, auth: target.keys.auth } },
        JSON.stringify(message),
        {
          vapidDetails: vapid,
          TTL: NOTIFICATION_DELIVERY_LIMIT.TtlSeconds,
          timeout: NOTIFICATION_DELIVERY_LIMIT.SendTimeoutMs,
          urgency: 'normal',
        },
      );
      return PUSH_SEND_STATUS.Sent;
    } catch (error) {
      const status = error instanceof webPush.WebPushError ? error.statusCode : null;
      if (status !== null && GONE_STATUSES.includes(status)) {
        return PUSH_SEND_STATUS.Gone;
      }
      this.logger.warn(`Push failed (status ${status ?? 'none'})`);
      return PUSH_SEND_STATUS.Failed;
    }
  }
}
