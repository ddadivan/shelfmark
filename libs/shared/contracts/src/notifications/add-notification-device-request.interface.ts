import type { PushSubscriptionKeys } from './push-subscription-keys.interface';

/** `POST /api/me/notifications/devices`: this browser's push subscription. */
export interface AddNotificationDeviceRequest {
  /** The push service URL the browser gave (https, a known push service, see the API docs). */
  endpoint: string;
  keys: PushSubscriptionKeys;
  /** Readable name, e.g. "Chrome on macOS" (shown in the device list). */
  name: string;
  /** IANA time zone of the device (`Intl.DateTimeFormat().resolvedOptions().timeZone`): quiet hours use it. */
  timeZone: string;
}
