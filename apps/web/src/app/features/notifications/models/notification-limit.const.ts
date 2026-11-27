import { MS_PER_DAY } from '../../../core/models/ms-per-day.const';

/** How long "Not now" keeps the notification question away. */
export const NOTIFICATION_LIMIT = {
  AskAgainAfterMs: 30 * MS_PER_DAY,
} as const;
