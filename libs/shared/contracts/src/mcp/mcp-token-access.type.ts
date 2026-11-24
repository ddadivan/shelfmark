import type { MCP_TOKEN_ACCESS } from './mcp-token-access.const';

/** One of `MCP_TOKEN_ACCESS`. */
export type McpTokenAccess = (typeof MCP_TOKEN_ACCESS)[keyof typeof MCP_TOKEN_ACCESS];
