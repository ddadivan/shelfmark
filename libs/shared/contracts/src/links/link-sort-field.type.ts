import type { LINK_SORT_FIELD } from './link-sort-field.const';

export type LinkSortField = (typeof LINK_SORT_FIELD)[keyof typeof LINK_SORT_FIELD];
