import type { TidyUndoItem } from './tidy-undo-item.interface';

/** `POST /api/ai/tidy/undo` body: the `undo` payload of the apply response, unchanged. */
export interface TidyUndoRequest {
  /** 1 to `TIDY_LIMIT.PageMax` items with distinct link ids. */
  items: TidyUndoItem[];
}
