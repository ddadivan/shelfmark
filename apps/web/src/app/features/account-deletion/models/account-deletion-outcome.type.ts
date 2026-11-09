import type { ACCOUNT_DELETION_OUTCOME } from './account-deletion-outcome.const';

export type AccountDeletionOutcome =
  (typeof ACCOUNT_DELETION_OUTCOME)[keyof typeof ACCOUNT_DELETION_OUTCOME];
