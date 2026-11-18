/** Rule offer routes (AI-2, #390). */
export const RULE_OFFER_ENDPOINT = {
  /** `POST`: is there a rule to offer for the links the user just filed? */
  Check: '/api/rules/offers/check',
  /** `POST`: "Not now" for a domain, remembered (204). */
  Dismiss: '/api/rules/offers/dismiss',
} as const;
