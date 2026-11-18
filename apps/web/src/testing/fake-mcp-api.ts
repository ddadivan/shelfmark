import type { McpTokenSummary, McpTokensResponse } from '@shelfmark/contracts';
import { of } from 'rxjs';
import type { McpApi } from '../app/features/ai/connect/models/mcp-api.interface';

/** Every method of `McpApi` as a Vitest mock (spec helper). */
export type FakeMcpApi = { [K in keyof McpApi]: ReturnType<typeof vi.fn<McpApi[K]>> };

/** A token summary, changed by `patch`. */
export function mcpToken(patch: Partial<McpTokenSummary> = {}): McpTokenSummary {
  return {
    id: '00000000-0000-4000-8000-000000000401',
    name: 'Claude Desktop',
    last4: 'aX9c',
    includeNotes: false,
    createdAt: '2026-11-12T10:00:00.000Z',
    lastUsedAt: null,
    callsThisWeek: 0,
    ...patch,
  };
}

/** `McpApi` answering `response` to `list`; `create` and `revoke` are set per spec. */
export function fakeMcpApi(
  response: McpTokensResponse = { available: true, items: [] },
): FakeMcpApi {
  return {
    list: vi.fn<McpApi['list']>(() => of(response)),
    create: vi.fn<McpApi['create']>(),
    revoke: vi.fn<McpApi['revoke']>(() => of(undefined)),
  };
}
