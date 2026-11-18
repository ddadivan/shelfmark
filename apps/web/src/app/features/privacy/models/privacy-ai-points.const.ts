/**
 * The points of the policy's AI section (`privacy.ai.<point>.term` / `.text`), in order (Privacy.dc);
 * `meaning` names Voyage AI, the second processor (AI-3); `ask` what Ask your shelf sends (AI-4).
 */
export const PRIVACY_AI_POINTS = [
  'processor',
  'sent',
  'kept',
  'meaning',
  'ask',
  'counted',
  'off',
] as const;
