/**
 * What a push service did with one message: `Sent` (accepted), `Gone` (404 / 410: the subscription
 * no longer exists, the row is deleted), `Failed` (anything else: kept, tried again next run),
 * `Refused` (the endpoint is not an allow-listed push service: nothing was sent).
 */
export const PUSH_SEND_STATUS = {
  Sent: 'sent',
  Gone: 'gone',
  Failed: 'failed',
  Refused: 'refused',
} as const;
