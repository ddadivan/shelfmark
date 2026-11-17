/** Stored state of a provider batch (`ai_batches.status`). */
export const AI_BATCH_STATE = {
  Submitted: 'submitted',
  Ended: 'ended',
  Canceled: 'canceled',
} as const;
