/** Token counts of one model call, for the logs only. */
export interface AskUsageTokens {
  /** Uncached input. */
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
}
