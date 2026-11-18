/**
 * How the weekly "From your shelf" block picked its links (F8): `theme` (AI on, AI pack, vectors
 * ready: older links near what the user saved lately) or `forgotten` (everyone else: old links never
 * or long not opened, in a weekly order). No model is called in either mode.
 */
export const REDISCOVER_MODE = {
  Theme: 'theme',
  Forgotten: 'forgotten',
} as const;
