import { ACCOUNT_PLAN, AI_TIER, type AiEntitlements } from '@shelfmark/contracts';
import { normalizeAdminEmail } from '../../config/normalize-admin-email';
import type { AiAccount } from '../models/ai-account.interface';

/**
 * The account's entitlements, computed per request (ADR 0047 point 7): the AI pack (stored) or an
 * email in `AI_FULL_ACCESS_EMAILS` gives `ai-pack`; plan `pro` (stored) or that email gives Pro. The
 * email counts only when the provider verified it and never for a demo user (like `AdminGuard`). The
 * environment is never written back to the account.
 */
export function aiEntitlements(
  account: AiAccount,
  fullAccessEmails: ReadonlySet<string>,
): AiEntitlements {
  const email = normalizeAdminEmail(account.email);
  const fullAccess =
    account.emailVerified && !account.isDemo && email !== null && fullAccessEmails.has(email);
  return {
    plan: fullAccess || account.plan === ACCOUNT_PLAN.Pro ? ACCOUNT_PLAN.Pro : ACCOUNT_PLAN.Free,
    aiTier: fullAccess || account.aiPack ? AI_TIER.AiPack : AI_TIER.Free,
  };
}
