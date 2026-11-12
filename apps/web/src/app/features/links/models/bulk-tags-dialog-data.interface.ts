import type { TagSuggestion } from '@shelfmark/ui';

/** What `BulkLinkActionsService` hands to the bulk tags dialog. */
export interface BulkTagsDialogData {
  /** "Tags for 3 links". */
  readonly heading: string;
  /** Every tag of the account (for "Add to all"). */
  readonly suggestions: readonly TagSuggestion[];
  /** The tags the selected links carry (for "Remove from all"). */
  readonly present: readonly TagSuggestion[];
}
