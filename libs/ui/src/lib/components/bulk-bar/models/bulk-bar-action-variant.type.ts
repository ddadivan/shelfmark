import type { BULK_BAR_ACTION_VARIANT } from './bulk-bar-action-variant.const';

export type BulkBarActionVariant =
  (typeof BULK_BAR_ACTION_VARIANT)[keyof typeof BULK_BAR_ACTION_VARIANT];
