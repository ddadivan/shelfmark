import type { TRASH_ITEM_KIND } from './trash-item-kind.const';

export type TrashItemKind = (typeof TRASH_ITEM_KIND)[keyof typeof TRASH_ITEM_KIND];
