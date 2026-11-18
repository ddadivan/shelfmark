import type { MCP_CLIENT } from './mcp-client.const';

export type McpClient = (typeof MCP_CLIENT)[keyof typeof MCP_CLIENT];
