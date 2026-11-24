import type { McpTokenAccess } from './mcp-token-access.type';
import type { McpTokenExpiry } from './mcp-token-expiry.type';

/** `POST /api/mcp/tokens`. */
export interface CreateMcpTokenRequest {
  /** Trimmed, 1 to `MCP_LIMIT.NameMax` characters, no control characters. */
  name: string;
  /** The assistant also sees the notes of the links (off by default in the web, fixed per token). */
  includeNotes: boolean;
  /** What the token may do; `read` when left out (older clients). */
  access?: McpTokenAccess;
  /** Days until it stops working (`MCP_TOKEN_EXPIRY_DAYS`), `null` or left out for never. */
  expiresInDays?: McpTokenExpiry;
}
