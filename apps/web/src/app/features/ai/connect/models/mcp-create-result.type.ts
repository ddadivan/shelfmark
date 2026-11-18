import type { CreateMcpTokenResponse } from '@shelfmark/contracts';
import type { McpTokenError } from './mcp-token-error.type';

/** What `McpTokensStore.create` resolves: the response with the secret (shown once), or why not. */
export type McpCreateResult =
  { ok: true; response: CreateMcpTokenResponse } | { ok: false; error: McpTokenError };
