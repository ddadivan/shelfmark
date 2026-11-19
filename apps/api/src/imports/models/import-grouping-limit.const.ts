/**
 * AI groups by topic (ADR 0056 decision 10): clusters smaller than `MinGroupSize` go to "rest", the
 * k-means run stops after `MaxIterations`, a cluster is named from at most `SampleTitlesMax` titles
 * (each cut to `SampleTitleMax`) and `SampleHostsMax` hosts, and `EmbedConcurrency` embedding
 * requests run at once. `KMin` is the least number of clusters tried; `EmbedTextMax` cuts the text
 * of one link before it is embedded.
 */
export const IMPORT_GROUPING_LIMIT = {
  MinGroupSize: 3,
  MaxIterations: 15,
  SampleTitlesMax: 8,
  SampleTitleMax: 100,
  SampleHostsMax: 3,
  EmbedConcurrency: 4,
  KMin: 2,
  EmbedTextMax: 400,
} as const;
