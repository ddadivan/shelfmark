/**
 * Rule offer detection (AI-2, #390, ADR 0050): the newest `SameChoiceMin` links of a site must share
 * one folder; `CandidatesMax` links of the site are read; at most `HostsPerCheckMax` sites per check.
 */
export const RULE_OFFER_LIMIT = {
  SameChoiceMin: 3,
  CandidatesMax: 20,
  HostsPerCheckMax: 5,
} as const;
