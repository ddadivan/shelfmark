import type { MCP_TOKEN_EXPIRY_DAYS } from './mcp-token-expiry-days.const';

/** A lifetime of `MCP_TOKEN_EXPIRY_DAYS` in days, or `null` for a token that never expires. */
export type McpTokenExpiry = (typeof MCP_TOKEN_EXPIRY_DAYS)[number] | null;
