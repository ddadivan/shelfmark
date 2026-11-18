import type { MeaningReasonSource } from './meaning-reason-source.type';

/** One "why it matched" reason, computed without a model. */
export interface MeaningReason {
  source: MeaningReasonSource;
  /** Plain text (a tag name, a folder name or a summary clause), at most `AI_SEARCH_LIMIT.WhyTextMax` characters. */
  text: string;
}
