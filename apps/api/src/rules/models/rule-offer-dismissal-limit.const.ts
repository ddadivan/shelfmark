/**
 * "Not now" answers kept per user (AI-2, ADR 0050): at the cap the oldest go first, so the table
 * stays bounded however many sites a user dismisses (an old site may be offered again).
 */
export const RULE_OFFER_DISMISSAL_LIMIT = {
  PerUserMax: 500,
} as const;
