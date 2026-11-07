import type { AddLinkSaved } from './add-link-saved.interface';

/**
 * Shared between `AddLinkDialogService` and the dialog: the save in flight, if any. The user can
 * dismiss the dialog (Esc, scrim, close button) while a save is running; the request still
 * finishes and the service resolves the caller with its result instead of `undefined`.
 */
export interface AddLinkSession {
  /** Resolves with the saved link, or `undefined` when the save failed. */
  saving: Promise<AddLinkSaved | undefined> | null;
}
