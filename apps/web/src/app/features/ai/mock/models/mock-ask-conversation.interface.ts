import type { MockAskTurnRecord } from './mock-ask-turn-record.interface';

/** One conversation of the mock Ask history (times in ms since the epoch). */
export interface MockAskConversation {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  updatedAt: number;
  turns: MockAskTurnRecord[];
}
