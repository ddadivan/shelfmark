/** What the AI step of a create did inside its transaction. */
export interface AiEnqueueResult {
  /** Jobs to start after the commit. */
  jobIds: string[];
  /** Whether the link row changed (status, or a draft result applied), so it must be read again. */
  touched: boolean;
}
