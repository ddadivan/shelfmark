import type { AdminStatsResponse } from '@shelfmark/contracts';

/** `GET /api/admin/stats` as the scenarios call it (#333); the scenario account is the admin. */
export interface ContractAdminApi {
  stats(): Promise<AdminStatsResponse>;
}
