import type { BULK_TAG_STATE } from './bulk-tag-state.const';

export type BulkTagState = (typeof BULK_TAG_STATE)[keyof typeof BULK_TAG_STATE];
