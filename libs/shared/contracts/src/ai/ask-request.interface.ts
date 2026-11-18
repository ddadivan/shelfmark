/** `POST /api/ai/ask` body. */
export interface AskRequest {
  /**
   * The question: trimmed and whitespace collapsed by the server, `ASK_LIMIT.QuestionMin` to
   * `QuestionMax` characters, no control characters. Never stored or logged.
   */
  question: string;
}
