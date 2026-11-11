import type { TRASH_FILTER } from './trash-filter.const';

export type TrashFilter = (typeof TRASH_FILTER)[keyof typeof TRASH_FILTER];
