import type { LINK_BATCH_STATUS } from './link-batch-status.const';

export type LinkBatchStatus = (typeof LINK_BATCH_STATUS)[keyof typeof LINK_BATCH_STATUS];
