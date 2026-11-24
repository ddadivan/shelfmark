import type { PushMessage } from './push-message.interface';
import type { PushSendStatus } from './push-send-status.type';
import type { PushTarget } from './push-target.interface';
import type { VapidKeys } from './vapid-keys.interface';

/** Hands one encrypted message to the push service of a subscription. Never throws, never logs the target. */
export interface PushSender {
  send(target: PushTarget, message: PushMessage, vapid: VapidKeys): Promise<PushSendStatus>;
}
