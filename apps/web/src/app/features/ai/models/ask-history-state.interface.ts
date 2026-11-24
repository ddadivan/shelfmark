import type { AskConversationSummary } from '@shelfmark/contracts';

/** `AskHistoryStore`: the conversation list as far as it was read. */
export interface AskHistoryState {
  readonly items: readonly AskConversationSummary[];
  readonly nextCursor: string | null;
  readonly loading: boolean;
  /** The first page was answered (or failed). */
  readonly loaded: boolean;
  readonly failed: boolean;
}
