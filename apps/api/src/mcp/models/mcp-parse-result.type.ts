import type { MCP_TOOL_CALL_KIND } from './mcp-tool-call-kind.const';

/** The narrowed arguments of a tool, or why they were refused (a fixed text, never the input). */
export type McpParseResult<T> =
  | { kind: typeof MCP_TOOL_CALL_KIND.Ok; value: T }
  | { kind: typeof MCP_TOOL_CALL_KIND.Invalid; message: string };
