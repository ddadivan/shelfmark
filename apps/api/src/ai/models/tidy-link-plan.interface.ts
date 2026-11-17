/** What one Tidy apply item will change on its link. */
export interface TidyLinkPlan {
  linkId: string;
  /** The folder to set, or `null` when the folder stays. */
  folderId: string | null;
  /** Tag names to add (each new on the link, within `LINK_LIMIT.TagsMax`). */
  tags: string[];
  /** The suggestion ids applied. */
  suggestionIds: string[];
}
