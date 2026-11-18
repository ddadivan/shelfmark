import type { MCP_USAGE_OUTCOME } from './mcp-usage-outcome.const';

/** The result of `McpUsageService.reserve`. */
export type McpUsageReservation =
  | { kind: typeof MCP_USAGE_OUTCOME.Counted; calls: number }
  | { kind: typeof MCP_USAGE_OUTCOME.Capped }
  | { kind: typeof MCP_USAGE_OUTCOME.Revoked };
