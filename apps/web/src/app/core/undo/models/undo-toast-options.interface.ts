/** Options of `UndoToastService.show()`; texts are already translated. */
export interface UndoToastOptions {
  /** What happened ("Link deleted"). */
  readonly title: string;
  /** What it happened to, on a second line (the link's title). */
  readonly detail?: string;
  readonly actionLabel: string;
  /** The user pressed Undo. */
  readonly onUndo: () => void;
  /** The window ended without Undo: commit the change. */
  readonly onExpire: () => void;
}
