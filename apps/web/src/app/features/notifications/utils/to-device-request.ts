import type { AddNotificationDeviceRequest } from '@shelfmark/contracts';

/** The API body from `PushSubscription.toJSON()`; `null` when the browser left something out. */
export function toDeviceRequest(
  json: PushSubscriptionJSON,
  name: string,
  timeZone: string,
): AddNotificationDeviceRequest | null {
  const p256dh = json.keys?.['p256dh'];
  const auth = json.keys?.['auth'];
  if (!json.endpoint || !p256dh || !auth) {
    return null;
  }
  return { endpoint: json.endpoint, keys: { p256dh, auth }, name, timeZone };
}
