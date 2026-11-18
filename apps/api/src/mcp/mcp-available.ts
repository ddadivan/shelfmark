import { ACCOUNT_PLAN } from '@shelfmark/contracts';
import { readAiFullAccessEmails } from '../ai/config/ai-full-access-config';
import type { AiAccount } from '../ai/models/ai-account.interface';
import { aiEntitlements } from '../ai/settings/ai-entitlements';

/**
 * Whether the account may create personal tokens and call the MCP server (ADR 0054 point 3): Pro
 * (stored plan or `AI_FULL_ACCESS_EMAILS`, read now) and never a demo account. Independent of the
 * AI main switch: Shelfmark makes no model call for MCP. Checked on create and on every call.
 */
export function mcpAvailable(account: AiAccount): boolean {
  return (
    !account.isDemo && aiEntitlements(account, readAiFullAccessEmails()).plan === ACCOUNT_PLAN.Pro
  );
}
