import type { AccountDeletionOutcome } from './account-deletion-outcome.type';

/** What `AccountDeletionService` hands to the confirmation dialog. */
export interface DeleteAccountDialogData {
  /** The account email the user has to type. */
  readonly email: string;
  /** Sends the deletion; the dialog closes on `deleted` and shows the other outcomes inline. */
  readonly submit: (email: string) => Promise<AccountDeletionOutcome>;
}
