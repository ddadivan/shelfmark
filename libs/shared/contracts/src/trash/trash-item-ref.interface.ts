import type { TrashItemKind } from './trash-item-kind.type';

/** Names one Trash entry in a restore or delete-forever request. */
export interface TrashItemRef {
  kind: TrashItemKind;
  id: string;
}
