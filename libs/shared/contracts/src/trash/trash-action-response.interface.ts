/** Result of a restore, delete-forever or empty request. Entries not in Trash (or not the user's) are skipped. */
export interface TrashActionResponse {
  /** Entries handled. */
  count: number;
}
