import { MCP_TOKEN_ACCESS, type McpTokenSummary } from '@shelfmark/contracts';
import type { McpTokenRowFormat } from '../models/mcp-token-row-format.interface';
import type { McpTokenRow } from '../models/mcp-token-row.interface';

/**
 * One token of Connect your assistant (Shelf 15-tools): the badge (access, or "Expired") and the
 * meta line "Created 3 Nov · used 2 hours ago · 12 calls this week · expires 3 Feb · includes
 * notes", left out piece by piece when it does not apply.
 */
export function mcpTokenRow(
  token: McpTokenSummary,
  now: number,
  f: McpTokenRowFormat,
): McpTokenRow {
  const expired = token.expiresAt !== null && Date.parse(token.expiresAt) <= now;
  const parts = [f.t('ai.connect.list.created', { date: f.date(token.createdAt) })];
  parts.push(
    token.lastUsedAt === null
      ? f.t('ai.connect.list.neverUsed')
      : f.t('ai.connect.list.usedWhen', { when: f.relative(token.lastUsedAt) }),
  );
  if (token.callsThisWeek > 0) {
    parts.push(f.t('ai.connect.list.calls', { calls: f.number(token.callsThisWeek) }));
  }
  if (token.expiresAt !== null && !expired) {
    parts.push(f.t('ai.connect.list.expires', { date: f.date(token.expiresAt) }));
  }
  if (token.includeNotes) parts.push(f.t('ai.connect.list.withNotes'));
  return {
    token,
    expired,
    meta: parts.join(' · '),
    badgeKey: expired
      ? 'ai.connect.list.expired'
      : token.access === MCP_TOKEN_ACCESS.Save
        ? 'ai.connect.access.save'
        : 'ai.connect.access.read',
  };
}
