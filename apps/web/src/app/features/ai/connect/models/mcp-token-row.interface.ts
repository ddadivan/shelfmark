import type { McpTokenSummary } from '@shelfmark/contracts';

/** A token as Connect your assistant lists it. */
export interface McpTokenRow {
  token: McpTokenSummary;
  /** Past its expiry: refused by the server, listed until revoked. */
  expired: boolean;
  /** The translated line under the name. */
  meta: string;
  /** Translation key of the badge: the access level, or "Expired". */
  badgeKey: string;
}
