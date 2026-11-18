/** What the mock model "answers" for a page, before parts the user filled are dropped. */
export interface MockAiOutcome {
  folderId: string | null;
  /** Existing tag names, at most `AI_LIMIT.SuggestedTagsMax`. */
  tags: string[];
  /** At most one tag that does not exist yet. */
  newTag: string | null;
  summary: string;
}
