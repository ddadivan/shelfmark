import type { TrashItemKind } from '@shelfmark/contracts';

/** One Trash entry as the entries query returns it: which row, and when it was deleted. */
export interface TrashEntryRow {
  kind: TrashItemKind;
  id: string;
  deletedAt: Date;
  /** Number of entries in the whole Trash (window count), repeated on every row. */
  total: number;
}
