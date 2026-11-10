import type { TRASH_RETENTION_DAYS } from './trash-retention-days.const';

export type TrashRetentionDays = (typeof TRASH_RETENTION_DAYS)[number];
