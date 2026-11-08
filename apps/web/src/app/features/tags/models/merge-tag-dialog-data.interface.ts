import type { TagResponse } from '@shelfmark/contracts';

/** What `TagActionsService` hands to the merge dialog. */
export interface MergeTagDialogData {
  readonly tag: TagResponse;
  /** Merges into the chosen tag; resolves false when the request failed (the dialog stays open). */
  readonly submit: (targetId: string) => Promise<boolean>;
}
