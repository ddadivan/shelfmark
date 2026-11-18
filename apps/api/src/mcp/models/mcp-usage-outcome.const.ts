/** How `McpUsageService.reserve` ended. */
export const MCP_USAGE_OUTCOME = {
  /** The call was counted. */
  Counted: 'counted',
  /** Today's cap is reached; nothing was written. */
  Capped: 'capped',
  /** The token was revoked meanwhile (a revoke racing the call); nothing was written. */
  Revoked: 'revoked',
} as const;
