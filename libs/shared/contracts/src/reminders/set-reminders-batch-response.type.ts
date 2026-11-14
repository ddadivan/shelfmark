import type { UpdateLinksBatchResponse } from '../links/update-links-batch-response.interface';

/** `POST /api/reminders/batch` response: the changed links in request order, like a bulk update. */
export type SetRemindersBatchResponse = UpdateLinksBatchResponse;
