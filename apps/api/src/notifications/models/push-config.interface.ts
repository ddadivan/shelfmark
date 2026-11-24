import type { VapidKeys } from './vapid-keys.interface';

/** Web Push configuration read once at boot; `vapid` is `null` = "not configured", nothing is sent. */
export interface PushConfig {
  vapid: VapidKeys | null;
}
