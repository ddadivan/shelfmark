import { MCP_BEARER_TOKEN_PATTERN } from '../models/mcp-bearer-token-pattern.const';

const BEARER_SCHEME = 'bearer';
const CREDENTIALS = /^(\S+) +(\S+)$/;

/**
 * The personal token of an `Authorization: Bearer smk_live_…` header, or `null`. The scheme is
 * case-insensitive (RFC 7235), separated by one or more spaces; the token must have the exact shape,
 * so anything else is refused before any query. Several headers (an array) are refused too.
 */
export function parseBearerToken(header: string | string[] | undefined): string | null {
  if (typeof header !== 'string') return null;
  const match = CREDENTIALS.exec(header);
  if (!match || match[1].toLowerCase() !== BEARER_SCHEME) return null;
  return MCP_BEARER_TOKEN_PATTERN.test(match[2]) ? match[2] : null;
}
