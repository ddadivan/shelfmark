/** The Ask handler's own deadlines (ADR 0052 point 2, ADR 0055 point 5), in milliseconds. */
export interface AskDeadlines {
  /** Hard stop from the request start: the answer ends with `done` and `truncated: true`. */
  streamMaxMs: number;
  /** First output (text or a tool call) of each model call, from that call's start. */
  roundFirstOutputMs: number;
  /** The tools of one round; a slower tool answers an error result. */
  toolRoundMs: number;
  /** Under this much time left, the next call is the forced answer (`tool_choice: none`). */
  finalAnswerReserveMs: number;
  /** An escalation is honoured only before this time from the request start. */
  escalateBeforeMs: number;
}
