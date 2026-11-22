/** The animation frame source of `DragWobble` (the window's rAF; a fake one in tests). */
export interface FrameScheduler {
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
}
