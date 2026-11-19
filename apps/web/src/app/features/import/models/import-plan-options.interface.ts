/** Options of the review step. */
export interface ImportPlanOptions {
  readonly skipDuplicates: boolean;
  readonly keepStructure: boolean;
  /** A new UUID per link (the idempotency key of its batch item). */
  /** At most this many links are planned (the room left under the link limit); the rest is left out. */
  readonly limit?: number;
  readonly newKey: () => string;
}
