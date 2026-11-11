import type { BULK_BAR_LAYOUT } from './bulk-bar-layout.const';

export type BulkBarLayout = (typeof BULK_BAR_LAYOUT)[keyof typeof BULK_BAR_LAYOUT];
