import type { McpTokenSummary } from './mcp-token-summary.interface';

/** `POST /api/mcp/tokens`: the only response that ever carries the secret. */
export interface CreateMcpTokenResponse {
  token: McpTokenSummary;
  /** `MCP_TOKEN_PREFIX` plus 43 base64url characters; shown once, stored only as a hash. */
  secret: string;
}
