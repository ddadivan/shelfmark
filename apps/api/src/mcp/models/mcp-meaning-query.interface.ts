/** The filters of a meaning search, the same as those of the word search. */
export interface McpMeaningQuery {
  query: string;
  folderId?: string;
  tag?: string;
  /** Links the word search already returned. */
  excludeIds: readonly string[];
  limit: number;
}
