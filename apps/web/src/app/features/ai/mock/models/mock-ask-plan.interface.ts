import type { AskDepth } from '@shelfmark/contracts';
import type { MockAskStep } from './mock-ask-step.interface';

/** What the mock Ask chat streams after `meta`: the timed steps, ending with `done` or `error`. */
export interface MockAskPlan {
  readonly steps: readonly MockAskStep[];
  readonly depth: AskDepth;
}
