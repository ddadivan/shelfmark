import { MCP_TOKEN_ACCESS, type McpTokenSummary } from '@shelfmark/contracts';
import type { McpTokenRow } from '../models/mcp-token-row.interface';

/** The owner's view of a token. The digest and the secret are never part of it. */
export function toMcpTokenSummary(row: McpTokenRow, callsThisWeek: number): McpTokenSummary {
  return {
    id: row.id,
    name: row.name,
    last4: row.last4,
    includeNotes: row.includeNotes,
    // The CHECK keeps the column to MCP_TOKEN_ACCESS; anything else reads as the narrower one.
    access: row.access === MCP_TOKEN_ACCESS.Save ? MCP_TOKEN_ACCESS.Save : MCP_TOKEN_ACCESS.Read,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    callsThisWeek,
  };
}
