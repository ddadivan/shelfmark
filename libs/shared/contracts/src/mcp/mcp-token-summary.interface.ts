import type { McpTokenAccess } from './mcp-token-access.type';

/** One personal MCP token as its owner sees it in Settings › AI (never the secret). */
export interface McpTokenSummary {
  id: string;
  /** The name the user gave it, usually the client ("Claude Desktop"). */
  name: string;
  /** The last four characters of the secret, shown as "…{last4}". */
  last4: string;
  /** The assistant also sees the notes of the links (fixed at creation). */
  includeNotes: boolean;
  /** What the token may do (fixed at creation). */
  access: McpTokenAccess;
  createdAt: string;
  /** ISO time from which the token is refused; `null` when it never expires. */
  expiresAt: string | null;
  /** ISO time of the last call (updated at most once a minute); `null` when never used. */
  lastUsedAt: string | null;
  /** Calls in the last 7 UTC days, today included. */
  callsThisWeek: number;
}
