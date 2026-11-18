/** AI usage of the account (counts only, never content). */
export interface AiUsage {
  /** Links processed this UTC calendar month. */
  linksUsed: number;
  /** The tier's monthly limit (`AI_QUOTA`). */
  linksLimit: number;
  /** ISO date (`YYYY-MM-DD`) the monthly count resets: the first day of the next UTC month. */
  resetsOn: string;
  /** Links processed by backfill so far (one-time allowance). */
  backfillUsed: number;
  /** The tier's one-time backfill allowance (`AI_QUOTA`); 0 = backfill not available. */
  backfillLimit: number;
}
