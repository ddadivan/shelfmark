import type { AskEvent } from '@shelfmark/contracts';

/** One timed step of a mock Ask stream: the event, sent `afterMs` after the previous step. */
export interface MockAskStep {
  readonly afterMs: number;
  readonly event: AskEvent;
}
