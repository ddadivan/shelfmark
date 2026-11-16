import type { DragSample } from './drag-sample.interface';

/** One sheet drag in progress. */
export interface DragState {
  readonly pointerId: number;
  readonly startY: number;
  /** The last few pointer positions, newest last; the release speed is read from them. */
  readonly samples: DragSample[];
  offset: number;
  /** The open fields and popups were told to let go (once, when the sheet first moves). */
  released: boolean;
}
