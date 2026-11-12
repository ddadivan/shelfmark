/** Why a paste-many save failed (see `batchSaveError`). */
export interface BatchSaveError {
  /** Translation key of the notice. */
  readonly key: string;
  /** How many links still fit the per-user limit, when the server said so; else `null`. */
  readonly fit: number | null;
}
