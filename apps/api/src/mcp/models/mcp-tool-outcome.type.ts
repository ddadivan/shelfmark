import type { MCP_TOOL_CALL_KIND } from './mcp-tool-call-kind.const';

/** What a tool's `run` answers. `structured` has passed the allow-list mappers only. */
export type McpToolOutcome =
  | { kind: typeof MCP_TOOL_CALL_KIND.Ok; structured: Record<string, unknown>; count: number }
  | { kind: typeof MCP_TOOL_CALL_KIND.Error; message: string };
