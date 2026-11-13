import type { ListTrashResponse, TrashActionResponse, TrashItemRef } from '@shelfmark/contracts';

/** The Trash endpoints (`/api/trash`) as the scenarios call them. */
export interface ContractTrashApi {
  list(): Promise<ListTrashResponse>;
  restore(items: readonly TrashItemRef[]): Promise<TrashActionResponse>;
  deleteForever(items: readonly TrashItemRef[]): Promise<TrashActionResponse>;
  empty(): Promise<TrashActionResponse>;
}
