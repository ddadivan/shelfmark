import type { SUMMARY_SOURCE } from './summary-source.const';

/** One of `SUMMARY_SOURCE`. */
export type SummarySource = (typeof SUMMARY_SOURCE)[keyof typeof SUMMARY_SOURCE];
