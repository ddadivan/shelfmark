/** What one Tidy apply item is meant to change on its link, before the writes say what did. */
export interface TidyLinkPlan {
  linkId: string;
  /** The folder to set and its suggestion, or `null` when the folder stays. */
  folder: { folderId: string; suggestionId: string } | null;
  /** Tags to add (each new on the link when read, within `LINK_LIMIT.TagsMax`) and their rows. */
  tags: { name: string; suggestionId: string }[];
}
