import type { AiAccount } from '../../ai/models/ai-account.interface';
import type { McpPrincipal } from './mcp-principal.interface';

/** A resolved MCP caller: the principal plus the account fields the entitlement check needs. */
export interface McpCaller {
  principal: McpPrincipal;
  account: AiAccount;
}
