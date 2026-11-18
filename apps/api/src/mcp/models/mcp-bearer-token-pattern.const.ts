import { MCP_TOKEN_PREFIX } from '@shelfmark/contracts';

/** The exact shape of a personal token: the prefix plus 43 base64url characters (case-sensitive). */
export const MCP_BEARER_TOKEN_PATTERN = new RegExp(`^${MCP_TOKEN_PREFIX}[A-Za-z0-9_-]{43}$`);
