import type { TrashItem } from './trash-item.interface';
import type { TrashRetentionDays } from './trash-retention-days.type';

/** `GET /api/trash`: the newest `TRASH_LIMIT.ListMax` entries, newest first. */
export interface ListTrashResponse {
  items: TrashItem[];
  /** Every entry in Trash, also those beyond the list. */
  total: number;
  retentionDays: TrashRetentionDays;
}
