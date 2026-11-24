import { mcpToken } from '../../../../../testing/fake-mcp-api';
import type { McpTokenRowFormat } from '../models/mcp-token-row-format.interface';
import { mcpTokenRow } from './mcp-token-row';

const NOW = Date.parse('2026-11-24T12:00:00.000Z');
const format: McpTokenRowFormat = {
  date: (iso) => iso.slice(0, 10),
  relative: () => 'just now',
  number: (value) => String(value),
  t: (key, params) => (params ? `${key}(${Object.values(params).join(',')})` : key),
};

describe('mcpTokenRow', () => {
  it('reads a never used read-only token that never expires', () => {
    const row = mcpTokenRow(mcpToken(), NOW, format);
    expect(row.expired).toBe(false);
    expect(row.badgeKey).toBe('ai.connect.access.read');
    expect(row.meta).toBe('ai.connect.list.created(2026-11-12) · ai.connect.list.neverUsed');
  });

  it('adds use, calls, expiry and notes for a save token', () => {
    const row = mcpTokenRow(
      mcpToken({
        access: 'save',
        lastUsedAt: '2026-11-24T11:00:00.000Z',
        callsThisWeek: 5,
        expiresAt: '2026-12-24T12:00:00.000Z',
        includeNotes: true,
      }),
      NOW,
      format,
    );
    expect(row.badgeKey).toBe('ai.connect.access.save');
    expect(row.meta).toBe(
      'ai.connect.list.created(2026-11-12) · ai.connect.list.usedWhen(just now) · ' +
        'ai.connect.list.calls(5) · ai.connect.list.expires(2026-12-24) · ai.connect.list.withNotes',
    );
  });

  it('marks a token past its expiry and drops the expiry date', () => {
    const row = mcpTokenRow(mcpToken({ expiresAt: '2026-11-24T12:00:00.000Z' }), NOW, format);
    expect(row.expired).toBe(true);
    expect(row.badgeKey).toBe('ai.connect.list.expired');
    expect(row.meta).not.toContain('expires');
  });
});
