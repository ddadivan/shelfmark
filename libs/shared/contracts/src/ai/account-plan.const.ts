/**
 * The account's plan (`docs/ai/FEATURES.md` › Tiers). Monetisation is not built yet: during the
 * private phase `AI_FULL_ACCESS_EMAILS` gives Pro (ADR 0047 point 7).
 */
export const ACCOUNT_PLAN = {
  Free: 'free',
  Pro: 'pro',
} as const;
