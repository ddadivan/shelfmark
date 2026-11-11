import type { LinkBatchErrorCode } from './link-batch-error-code.type';

/** An item of a batch create that was not saved. */
export interface LinkBatchItemError {
  /** Position of the item in the request. */
  index: number;
  url: string;
  code: LinkBatchErrorCode;
}
