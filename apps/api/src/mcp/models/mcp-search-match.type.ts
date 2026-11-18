import type { MCP_SEARCH_MATCH } from './mcp-search-match.const';

export type McpSearchMatch = (typeof MCP_SEARCH_MATCH)[keyof typeof MCP_SEARCH_MATCH];
