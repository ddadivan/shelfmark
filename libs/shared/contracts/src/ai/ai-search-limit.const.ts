/**
 * Search by meaning and related links limits (AI-3, ADR 0051): query length, result counts and the
 * "why it matched" caps.
 */
export const AI_SEARCH_LIMIT = {
  QueryMinChars: 3,
  QueryMax: 200,
  MeaningDefault: 3,
  MeaningMax: 10,
  RelatedDefault: 5,
  RelatedMax: 10,
  WhyMax: 2,
  WhyTextMax: 80,
} as const;
