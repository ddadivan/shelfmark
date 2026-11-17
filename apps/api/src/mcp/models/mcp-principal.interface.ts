/** Who an MCP call acts for, set on the request by `McpTokenGuard`. Tools query only this user. */
export interface McpPrincipal {
  userId: string;
  /** The personal token the call came with (usage counts per token). */
  tokenId: string;
  /** The token was created with "Include my notes". */
  includeNotes: boolean;
}
