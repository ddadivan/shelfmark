import type { MCP_TOOL_CALL_KIND } from './mcp-tool-call-kind.const';
import type { McpToolOutcome } from './mcp-tool-outcome.type';

/** The result of `McpToolRegistry.call`. */
export type McpToolCall =
  | McpToolOutcome
  | { kind: typeof MCP_TOOL_CALL_KIND.Invalid; message: string }
  | { kind: typeof MCP_TOOL_CALL_KIND.Unknown };
