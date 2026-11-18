/** Routes of the MCP server (#395). `:id` is a personal token id. */
export const MCP_ENDPOINT = {
  /** The Streamable HTTP endpoint MCP clients connect to (bearer token, never a cookie). */
  Server: '/api/mcp',
  /** Session: `GET` the user's tokens, `POST` creates one (the secret is answered once). */
  Tokens: '/api/mcp/tokens',
  /** Session: `DELETE` revokes a token; it stops working at once. */
  Token: '/api/mcp/tokens/:id',
} as const;
