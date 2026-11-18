/** What a `PATCH /api/links/:id` did to one link, for its AI step (before and after the write). */
export interface LinkUpdateChange {
  linkId: string;
  /** Whether the request sent a folder and a tag list at all. */
  folderSent: boolean;
  tagsSent: boolean;
  folderBefore: string | null;
  folderAfter: string | null;
  tagsBefore: readonly string[];
  tagsAfter: readonly string[];
  /** The URL now points to another page (not just the same URL written differently). */
  newPage: boolean;
  summarySource: string | null;
}
