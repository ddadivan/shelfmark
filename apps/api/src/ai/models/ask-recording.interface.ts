import type { AskConversationStep } from '@shelfmark/contracts';
import type { AskStoredCards } from './ask-stored-cards.interface';

/** What an answer showed besides its text, recorded from the stream for the Ask history. */
export interface AskRecording {
  steps: AskConversationStep[];
  cards: AskStoredCards[];
}
