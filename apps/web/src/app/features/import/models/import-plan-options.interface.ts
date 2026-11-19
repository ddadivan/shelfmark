/** Options of the review step. */
export interface ImportPlanOptions {
  readonly skipDuplicates: boolean;
  readonly keepStructure: boolean;
  /** A new UUID per link (the idempotency key of its batch item). */
  readonly newKey: () => string;
}
