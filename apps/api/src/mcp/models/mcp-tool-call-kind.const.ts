/** Outcomes of parsing and running a tool call. */
export const MCP_TOOL_CALL_KIND = {
  /** The tool ran: `structuredContent` with the number of items it returned. */
  Ok: 'ok',
  /** A tool-level failure the assistant should see (`isError: true`), such as "Link not found". */
  Error: 'error',
  /** The arguments do not match the input schema (JSON-RPC `-32602`). */
  Invalid: 'invalid',
  /** No tool of that name (JSON-RPC `-32602`). */
  Unknown: 'unknown',
} as const;
