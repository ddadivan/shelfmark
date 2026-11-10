import type { TrashItemRef } from './trash-item-ref.interface';

/** Body of `POST /api/trash/restore` and `POST /api/trash/delete`: 1 to `TRASH_LIMIT.BatchMax` entries. */
export interface TrashItemsRequest {
  items: TrashItemRef[];
}
