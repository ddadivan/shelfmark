/** Keyset cursor of the admin feedback list (newest first). */
export interface AdminFeedbackCursor {
  v: number;
  /** `createdAt` of the last row, ISO. */
  t: string;
  /** Id of the last row, the tie-breaker. */
  id: string;
}
