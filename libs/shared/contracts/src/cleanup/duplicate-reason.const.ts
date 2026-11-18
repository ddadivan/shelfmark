/** Why links form a duplicate group: the same normalised address, or the same page found by AI. */
export const DUPLICATE_REASON = {
  SameAddress: 'same-address',
  SamePage: 'same-page',
} as const;
