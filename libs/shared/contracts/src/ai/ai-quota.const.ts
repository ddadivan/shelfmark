import type { AiQuotaLimits } from './ai-quota-limits.interface';
import type { AiTier } from './ai-tier.type';

/**
 * Starting limits per AI tier (ADR 0047 point 7). Backfill is a separate one-time allowance (author's
 * decision, Nov 17, 2026): the AI pack gets 5,000 links, Free none. Chat limits come with AI-4.
 */
export const AI_QUOTA = {
  free: { linksPerMonth: 50, backfillLinks: 0 },
  'ai-pack': { linksPerMonth: 1000, backfillLinks: 5000 },
} as const satisfies Record<AiTier, AiQuotaLimits>;
