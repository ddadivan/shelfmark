import type { MockMeaningDoc } from './mock-meaning-doc.interface';

/** A mock meaning match with its similarity (0 to 1), best first. */
export interface MockMeaningRanked {
  readonly doc: MockMeaningDoc;
  readonly score: number;
}
