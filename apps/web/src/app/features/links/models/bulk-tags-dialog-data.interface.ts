/** What `BulkLinkActionsService` hands to the bulk tags dialog. */
export interface BulkTagsDialogData {
  /** "Tags for 3 links". */
  readonly heading: string;
  /** How many links are selected. */
  readonly total: number;
  /**
   * The tags of the list: the ones the selected links carry first (most used first), then the
   * other tags of the account (`count` 0).
   */
  readonly tags: readonly { readonly name: string; readonly count: number }[];
}
