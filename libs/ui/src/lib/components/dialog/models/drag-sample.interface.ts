/** A pointer position during a sheet drag. */
export interface DragSample {
  readonly y: number;
  /** `event.timeStamp` in ms. */
  readonly time: number;
}
