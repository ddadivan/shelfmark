import type { AskEntry } from './ask-entry.interface';

/** `AskStore`: the questions of this panel, oldest first, and the stored conversation they continue. */
export interface AskState {
  readonly entries: readonly AskEntry[];
  /** The Ask history conversation (`done.conversationId`), `null` until the server stored a turn. */
  readonly conversationId: string | null;
}
