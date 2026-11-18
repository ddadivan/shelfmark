import type { TagResponse } from '@shelfmark/contracts';

/** What a merge did: the target as it is now, and the link ids an Undo needs. */
export interface TagMergeResult {
  target: TagResponse;
  /** Links of the user that carried the source tag (trashed ones included). */
  linkIds: string[];
  /** Of those, the links that did not carry the target before. */
  addedLinkIds: string[];
}
