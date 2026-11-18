/** What the mock Rediscover keeps in `localStorage`. */
export interface MockRediscoverState {
  /** ISO week the block was dismissed in, or `null`. */
  dismissedWeek: string | null;
  /** Links marked "Not interested". */
  hidden: string[];
}
