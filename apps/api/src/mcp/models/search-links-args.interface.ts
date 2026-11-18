/** The narrowed arguments of `search_links`. */
export interface SearchLinksArgs {
  /** Trimmed, 1 to `MCP_LIMIT.QueryMax` characters. */
  query: string;
  folderId?: string;
  /** Normalised tag name. */
  tag?: string;
  limit: number;
}
