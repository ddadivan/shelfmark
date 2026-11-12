/** One pasted link in the paste-many list. */
export interface PasteRow {
  /** The link as it will be saved (`https://` added to a bare domain). */
  readonly url: string;
  /** Idempotency key of this link for the whole dialog session, so a retry never saves it twice. */
  readonly key: string;
}
