import type { MockAskResult } from './mock-ask-result.interface';

/** What the mock model reads from an Ask round's messages. */
export interface MockAskTranscript {
  /** The current question, lower case. */
  question: string;
  /** Today's UTC day from the question message. */
  today: string;
  /** The question of the last history turn, lower case, `null` without history. */
  previousQuestion: string | null;
  /** Refs of the last history turn's links, in order. */
  historyRefs: number[];
  /** Tool results of this question so far, in order (gathered ones of the quick model first). */
  results: MockAskResult[];
  /** Model calls of this loop so far (assistant messages after the question). */
  rounds: number;
  /** Whether answer text was already written in this loop. */
  wroteText: boolean;
}
