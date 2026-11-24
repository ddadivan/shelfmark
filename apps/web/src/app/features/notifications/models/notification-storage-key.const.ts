/**
 * Device preferences of notifications (not per user, not in `USER_STORAGE_KEYS`): `Device` is
 * `off` once notifications were turned off here while the browser still allows them; `Asked` is
 * the time "Not now" hid the question after a reminder (it stays hidden for 30 days).
 */
export const NOTIFICATION_STORAGE_KEY = {
  Device: 'sm-notifications-device',
  Asked: 'sm-notifications-asked',
} as const;
