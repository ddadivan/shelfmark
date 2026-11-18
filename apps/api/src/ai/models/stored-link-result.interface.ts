/**
 * A validated job result with the folder key resolved to the user's folder id. Stored in
 * `ai_jobs.result` only while a draft is not attached to a link yet; cleared on attach.
 */
export interface StoredLinkResult {
  tags: string[];
  newTag: string | null;
  folderId: string | null;
  summary: string | null;
}
