/**
 * Parts of a URL that make the mock AI fail on purpose (e2e and manual checks): `Fail` is "not
 * available right now" (and the provider-status line), `Refuse` a rejected answer (nothing shows),
 * `Quota` the monthly limit.
 */
export const MOCK_AI_URL_MARKER = {
  Fail: 'ai-fail',
  Refuse: 'ai-refuse',
  Quota: 'ai-quota',
} as const;
