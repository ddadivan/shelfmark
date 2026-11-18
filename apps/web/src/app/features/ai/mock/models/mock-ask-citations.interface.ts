import type { AskCiteEvent, AskTextEvent } from '@shelfmark/contracts';

/** A mock answer as stream events, and the retrieved source numbers in citation order. */
export interface MockAskCitations {
  /** One entry per word chunk: its text and citation events. */
  readonly chunks: readonly (readonly (AskTextEvent | AskCiteEvent)[])[];
  /** `cited[k - 1]` is the retrieved number cited as `k`. */
  readonly cited: readonly number[];
}
