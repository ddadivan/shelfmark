import type { DragSample } from './drag-sample.interface';

/** One sheet drag in progress. */
export interface DragState {
  readonly pointerId: number;
  readonly startY: number;
  /** The last few pointer positions, newest last; the release speed is read from them. */
  readonly samples: DragSample[];
  offset: number;
}
