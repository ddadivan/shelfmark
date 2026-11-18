import { MCP_TOKEN_ERROR } from './mcp-token-error.const';
import type { McpTokenError } from './mcp-token-error.type';

/** Translation key of the create dialog's notice for each `McpTokenError`. */
export const MCP_TOKEN_ERROR_KEY = {
  [MCP_TOKEN_ERROR.Limit]: 'ai.connect.create.error.limit',
  [MCP_TOKEN_ERROR.NotAvailable]: 'ai.connect.create.error.notAvailable',
  [MCP_TOKEN_ERROR.Save]: 'ai.connect.create.error.save',
} as const satisfies Record<McpTokenError, string>;
