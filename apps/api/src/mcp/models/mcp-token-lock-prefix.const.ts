/**
 * Prefix of the per-user advisory lock that serialises token creation, so the per-user cap cannot be
 * raced. Never taken together with another lock.
 */
export const MCP_TOKEN_LOCK_PREFIX = 'mcp-tokens:';
