/** The filters of a meaning search, the same as those of the word search. */
export interface McpMeaningQuery {
  query: string;
  folderId?: string;
  tag?: string;
  /**
   * The token was created with "Include my notes". When `false`, the note (and anything derived from
   * it) must not influence which links match, so the matches never reveal note contents.
   */
  includeNotes: boolean;
  /** Links the word search already returned. */
  excludeIds: readonly string[];
  limit: number;
}
