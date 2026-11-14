import type { LINK_BATCH_ERROR_CODE } from './link-batch-error-code.const';

export type LinkBatchErrorCode = (typeof LINK_BATCH_ERROR_CODE)[keyof typeof LINK_BATCH_ERROR_CODE];
