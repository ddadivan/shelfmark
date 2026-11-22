/** One character of a `ui-number-flow`, with its place counted from the end of the text. */
export interface NumberFlowSlot {
  readonly char: string;
  /** 0 for the last character: digits keep their place when the number grows or shrinks. */
  readonly pos: number;
}
