import type { LinkKind } from '@shelfmark/contracts';

/**
 * A validated job result with the folder key resolved to the user's folder id. Stored in
 * `ai_jobs.result` only while a draft is not attached to a link yet; cleared on attach.
 */
export interface StoredLinkResult {
  tags: string[];
  newTags: string[];
  moreTags: string[];
  folderId: string | null;
  summary: string | null;
  /** The cleaned-up title of a draft; never applied to a saved link. */
  title: string | null;
  /**
   * What the page is (#535, ADR 0057); written only while the link's kind is `other` and the user
   * never chose one. `null` when the model was unsure (and for results stored before #535).
   */
  kind: LinkKind | null;
}
