/** The range a `ui-resize-handle` value moves in, and the reading direction of the page. */
export interface ResizeHandleLimits {
  min: number;
  max: number;
  /** Right-to-left: the pane before the handle is on the right, so every direction flips. */
  rtl: boolean;
}
