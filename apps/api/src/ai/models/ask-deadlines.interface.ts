/** The Ask handler's own deadlines (ADR 0052 point 2), from the start of the request. */
export interface AskDeadlines {
  /** No model text by then: `error` `unavailable`, refunded. */
  firstTokenMs: number;
  /** Hard stop: the answer ends with `done` and `truncated: true`. */
  streamMaxMs: number;
}
