import type { MCP_TOKEN_ERROR } from './mcp-token-error.const';

export type McpTokenError = (typeof MCP_TOKEN_ERROR)[keyof typeof MCP_TOKEN_ERROR];
