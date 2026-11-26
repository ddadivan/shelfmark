/** How a bulk update ended: `done` links were confirmed by the server before it failed (or all of them). */
export interface BulkUpdateOutcome {
  readonly ok: boolean;
  readonly done: number;
}
