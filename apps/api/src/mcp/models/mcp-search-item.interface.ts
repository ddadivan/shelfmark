import type { McpLink } from './mcp-link.interface';
import type { McpSearchMatch } from './mcp-search-match.type';

/** One `search_links` result. */
export interface McpSearchItem extends McpLink {
  match: McpSearchMatch;
}
