/**
 * How the rule offer check reads a site's links (AI-2): the address match (`ILIKE`) is wider than
 * the site (`notyoutube.com`, `?ref=youtube.com`), so rows are read newest first in batches of
 * `BatchSize` and filtered by the exact `ruleHost` until `RULE_OFFER_LIMIT.CandidatesMax` links of
 * the site are found or `RowsMax` rows were read.
 */
export const RULE_OFFER_SCAN = {
  BatchSize: 100,
  RowsMax: 500,
} as const;
