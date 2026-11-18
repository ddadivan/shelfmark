/**
 * The account's AI allowance tier (ADR 0047 point 7): `ai-pack` for accounts with the AI pack or in
 * `AI_FULL_ACCESS_EMAILS`, `free` for everyone else. Limits are in `AI_QUOTA`.
 */
export const AI_TIER = {
  Free: 'free',
  AiPack: 'ai-pack',
} as const;
