/** `POST /api/cleanup/run` body. */
export interface CleanupRunRequest {
  /** Ask for the AI checks too (honoured only when `aiAvailable`). */
  includeAi: boolean;
}
