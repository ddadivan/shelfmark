import type { AskMessage } from './ask-message.type';

/** The messages of a loop and the index of the last history message (the follow-up cache breakpoint). */
export interface AskBuiltMessages {
  messages: AskMessage[];
  historyEnd: number | null;
}
