import type { MeStatsResponse } from '@shelfmark/contracts';

/** `GET /api/me/stats` as the scenarios call it (#352). */
export interface ContractMeApi {
  stats(): Promise<MeStatsResponse>;
}
