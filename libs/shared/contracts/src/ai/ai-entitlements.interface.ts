import type { AccountPlan } from './account-plan.type';
import type { AiTier } from './ai-tier.type';

/** What the account is entitled to, computed per request (account fields and `AI_FULL_ACCESS_EMAILS`). */
export interface AiEntitlements {
  plan: AccountPlan;
  aiTier: AiTier;
}
