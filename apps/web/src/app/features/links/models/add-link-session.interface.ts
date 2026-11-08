import type { AddLinkSaved } from './add-link-saved.interface';

/**
 * Shared between `AddLinkDialogService` and the dialog: the save in flight, if any. The user can
 * dismiss the dialog (Esc, scrim, close button) while a save is running; the request still
 * finishes and the service resolves the caller with its result instead of `undefined`.
 */
export interface AddLinkSession {
  /** Resolves with the saved link, or `undefined` when the save failed. */
  saving: Promise<AddLinkSaved | undefined> | null;
  /**
   * Sent with every save attempt of this dialog (the server replays by key, so a retry or a double
   * click never creates a second link). Replaced when the payload changed since the key was last
   * sent. `null` in edit mode.
   */
  idempotencyKey: string | null;
  /** Fingerprint of what the user had entered when `idempotencyKey` was last sent (not the autofilled title or preview hints); `null` before the first attempt. */
  sentFingerprint: string | null;
}
