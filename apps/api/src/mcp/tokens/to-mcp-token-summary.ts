import type { McpTokenSummary } from '@shelfmark/contracts';
import type { McpTokenRow } from '../models/mcp-token-row.interface';

/** The owner's view of a token. The digest and the secret are never part of it. */
export function toMcpTokenSummary(row: McpTokenRow, callsThisWeek: number): McpTokenSummary {
  return {
    id: row.id,
    name: row.name,
    last4: row.last4,
    includeNotes: row.includeNotes,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    callsThisWeek,
  };
}
