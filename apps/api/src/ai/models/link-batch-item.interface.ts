import type { LinkJobOutcome } from './link-job-outcome.type';

/** The result of one request of a batch. */
export interface LinkBatchItem {
  customId: string;
  outcome: LinkJobOutcome;
}
