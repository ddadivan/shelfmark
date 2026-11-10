import type { TrashItem, TrashItemRef } from '@shelfmark/contracts';

/** Identity of a Trash entry: a link and a folder may share an id space, so the kind is part of it. */
export function trashKey(item: TrashItemRef): string {
  return `${item.kind}:${item.id}`;
}

/** The ref a request names an entry by. */
export function toRef(item: TrashItem): TrashItemRef {
  return { kind: item.kind, id: item.id };
}
