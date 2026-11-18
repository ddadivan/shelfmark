import type { McpTokenSummary } from '@shelfmark/contracts';

/** State of `McpTokensStore`. Never holds a secret: only the summaries the list shows. */
export interface McpTokensState {
  /** Pro and not the demo: tokens can be created. */
  available: boolean;
  items: McpTokenSummary[];
  loaded: boolean;
  loading: boolean;
  loadFailed: boolean;
  /** Id of the token being revoked. */
  revokingId: string | null;
}
