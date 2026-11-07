import type { SORT_ORDER } from './sort-order.const';

export type SortOrder = (typeof SORT_ORDER)[keyof typeof SORT_ORDER];
