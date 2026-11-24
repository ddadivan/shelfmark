/** Test hooks of `NotificationDeliveryService.run`. */
export interface NotificationDeliveryOptions {
  now?: Date;
  budgetMs?: number;
  usersPerBatch?: number;
}
