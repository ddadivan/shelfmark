/** A tool as `tools/list` describes it (MCP `Tool`). */
export interface McpToolDefinition {
  name: string;
  title: string;
  /** Ends with `MCP_UNTRUSTED_CONTENT_NOTE`. */
  description: string;
  /** JSON Schema of the arguments (`additionalProperties: false`). */
  inputSchema: Record<string, unknown>;
  /** JSON Schema of `structuredContent`. */
  outputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
}
