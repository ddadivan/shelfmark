import { ACCOUNT_DELETION_OUTCOME } from './account-deletion-outcome.const';

/** Translation key of the inline error of each failed outcome. */
export const ACCOUNT_DELETION_ERROR_KEY = {
  [ACCOUNT_DELETION_OUTCOME.Mismatch]: 'settings.delete.error.mismatch',
  [ACCOUNT_DELETION_OUTCOME.RateLimited]: 'settings.delete.error.rateLimited',
  [ACCOUNT_DELETION_OUTCOME.Failed]: 'settings.delete.error.failed',
} as const;
