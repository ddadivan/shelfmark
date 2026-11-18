import type { LinkResponse } from '../links/link-response.interface';
import type { MeaningReason } from './meaning-reason.interface';

/** A link found by meaning, best first, with at most `AI_SEARCH_LIMIT.WhyMax` reasons. */
export interface MeaningMatch {
  link: LinkResponse;
  why: MeaningReason[];
}
