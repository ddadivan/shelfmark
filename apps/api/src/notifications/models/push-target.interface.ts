import type { PushSubscriptionKeys } from '@shelfmark/contracts';

/** Where one push goes: a stored subscription (a capability: never logged). */
export interface PushTarget {
  endpoint: string;
  keys: PushSubscriptionKeys;
}
