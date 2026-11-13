import type { ConnectedAccount, LinkResponse } from '@shelfmark/contracts';

/**
 * What `buildMockStats` counts: the live mock library, the time, the first day of the week
 * (`MeStatsQuery.firstDay`, Monday when absent) and the account details.
 */
export interface MockStatsInput {
  readonly links: readonly LinkResponse[];
  readonly folderCount: number;
  readonly now: Date;
  readonly firstDay?: number;
  readonly memberSince: string;
  readonly connectedAccounts: readonly ConnectedAccount[];
}
