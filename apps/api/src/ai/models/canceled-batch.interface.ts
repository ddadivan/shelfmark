/** A provider batch closed in the database and still to be cancelled at the provider. */
export interface CanceledBatch {
  provider: string;
  providerBatchId: string;
}
