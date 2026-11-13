import type { Observable } from 'rxjs';
import type { MeStatsResponse } from '@shelfmark/contracts';

/** Seam for the "Your shelf" numbers of the Account page (`GET /api/me/stats`, #352). */
export interface MeStatsApi {
  get(): Observable<MeStatsResponse>;
}
