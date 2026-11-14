/**
 * Reminders routes (#275): `GET` the list, `GET /count` the due count, `PUT` / `DELETE /:linkId`
 * one link's reminder, `POST /batch` the same reminder on several links.
 */
export const REMINDER_ENDPOINT = {
  Base: '/api/reminders',
  Count: '/api/reminders/count',
  Batch: '/api/reminders/batch',
} as const;
