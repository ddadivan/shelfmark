import type { AiSearchStatus } from './ai-search-status.interface';
import type { MeaningMatch } from './meaning-match.interface';

/**
 * `GET /api/ai/search` answer, always 200: only links that are not word matches for `q`. `items` is
 * empty unless `status.state` is `ready`.
 */
export interface MeaningSearchResponse {
  status: AiSearchStatus;
  items: MeaningMatch[];
}
