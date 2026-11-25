/** Test hooks of `NotificationDeliveryService.run`. */
export interface NotificationDeliveryOptions {
  now?: Date;
  budgetMs?: number;
  usersPerBatch?: number;
  /** Vercel Schedule occurrence (`ce-id`), logged only; absent on manual or legacy calls. */
  executionId?: string;
}
