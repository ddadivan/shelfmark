import type { LinkJobInput } from './link-job-input.interface';

/** One request of a backfill batch; `customId` is the job id. */
export interface LinkBatchRequest {
  customId: string;
  input: LinkJobInput;
}
