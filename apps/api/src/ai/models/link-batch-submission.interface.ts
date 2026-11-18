import type { LinkBatchItem } from './link-batch-item.interface';

/**
 * What submitting a batch returns. The mock provider answers with `completed` at once (stateless,
 * so it works across serverless instances); a real provider returns `null` and is polled.
 */
export interface LinkBatchSubmission {
  providerBatchId: string;
  completed: LinkBatchItem[] | null;
}
