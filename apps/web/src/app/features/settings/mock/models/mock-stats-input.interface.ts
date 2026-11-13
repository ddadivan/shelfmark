import type { ConnectedAccount, LinkResponse } from '@shelfmark/contracts';

/** What `buildMockStats` counts: the live mock library, the time and the account details. */
export interface MockStatsInput {
  readonly links: readonly LinkResponse[];
  readonly folderCount: number;
  readonly tagCount: number;
  readonly now: Date;
  readonly memberSince: string;
  readonly connectedAccounts: readonly ConnectedAccount[];
}
