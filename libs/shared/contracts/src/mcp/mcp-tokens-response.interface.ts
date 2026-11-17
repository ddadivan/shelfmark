import type { McpTokenSummary } from './mcp-token-summary.interface';

/** `GET /api/mcp/tokens`: the user's personal tokens, newest first. */
export interface McpTokensResponse {
  /** The account may create tokens and call the server: Pro and not a demo account. */
  available: boolean;
  items: McpTokenSummary[];
}
