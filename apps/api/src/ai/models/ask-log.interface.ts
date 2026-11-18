/** What one Ask answer did, for its log line: counts only, never the question or the answer. */
export interface AskLog {
  outcome: string;
  retrieved: number;
  cited: number;
  inputTokens: number;
  outputTokens: number;
}
