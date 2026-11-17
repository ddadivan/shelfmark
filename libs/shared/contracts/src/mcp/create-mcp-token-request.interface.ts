/** `POST /api/mcp/tokens`. */
export interface CreateMcpTokenRequest {
  /** Trimmed, 1 to `MCP_LIMIT.NameMax` characters, no control characters. */
  name: string;
  /** The assistant also sees the notes of the links (off by default in the web, fixed per token). */
  includeNotes: boolean;
}
