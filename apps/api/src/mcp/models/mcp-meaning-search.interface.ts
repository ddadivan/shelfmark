import type { McpMeaningQuery } from './mcp-meaning-query.interface';

/**
 * AI-3 seam ("search by meaning", not on this branch): ids of the user's live links that match the
 * query by meaning, best first. The AI-3 implementation answers only when the user's AI and "Search
 * by meaning" are on and their search status is `ready`, and reserves one `search_queries` count per
 * call; `NoMeaningSearch` (the default here) never matches.
 */
export interface McpMeaningSearch {
  find(userId: string, query: McpMeaningQuery): Promise<string[]>;
}
