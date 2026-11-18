import type { RediscoverResponse } from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/** Seam for the Rediscover routes (`REDISCOVER_ENDPOINT`, F8, plan 10.3). */
export interface RediscoverApi {
  /** `GET /api/rediscover`: this week's block; empty `items` = no block. */
  getBlock(): Observable<RediscoverResponse>;
  /** `POST /api/rediscover/dismiss` (204): no block until next week. */
  dismiss(): Observable<void>;
  /** `POST /api/rediscover/links/:id/hide` (204, 404 for a foreign link): "Not interested". */
  hide(linkId: string): Observable<void>;
}
