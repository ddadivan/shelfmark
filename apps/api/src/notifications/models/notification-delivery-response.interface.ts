/** Answer of the delivery cron: counts only. */
export interface NotificationDeliveryResponse {
  /** False when the VAPID keys are missing: nothing was read or sent. */
  configured: boolean;
  /** Messages accepted by a push service. */
  sent: number;
  /** Subscriptions deleted because the push service answered 404 / 410. */
  removed: number;
  /** Users skipped because every device of theirs was in quiet hours. */
  quiet: number;
  /** Reminders older than the delivery window, marked handled without a push. */
  skipped: number;
  /** True when the budget ran out with work left. */
  hasMore: boolean;
}
