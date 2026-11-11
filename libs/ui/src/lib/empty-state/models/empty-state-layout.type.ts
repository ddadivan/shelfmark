import type { EMPTY_STATE_LAYOUT } from './empty-state-layout.const';

/** Where an empty state sits: `inline` in a section, `page` as the page-level card. */
export type EmptyStateLayout = (typeof EMPTY_STATE_LAYOUT)[keyof typeof EMPTY_STATE_LAYOUT];
