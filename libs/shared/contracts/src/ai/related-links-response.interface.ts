import type { AiSearchStatus } from './ai-search-status.interface';
import type { MeaningMatch } from './meaning-match.interface';

/**
 * `GET /api/links/:id/related` answer: the closest other live links by the link's stored vector (no
 * model call). `items` is empty while the link has no vector or search by meaning is off.
 */
export interface RelatedLinksResponse {
  status: AiSearchStatus;
  items: MeaningMatch[];
}
