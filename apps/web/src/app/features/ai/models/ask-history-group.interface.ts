import type { AskConversationSummary } from '@shelfmark/contracts';

/** A section of the conversation list (Shelf 11-ask: Today, Earlier). */
export interface AskHistoryGroup {
  /** Translation key of the section label. */
  readonly labelKey: string;
  readonly items: readonly AskConversationSummary[];
}
