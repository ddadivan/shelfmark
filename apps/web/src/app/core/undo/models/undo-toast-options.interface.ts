/** Options of `UndoToastService.show()`; texts are already translated. */
export interface UndoToastOptions {
  readonly text: string;
  readonly actionLabel: string;
  /** The user pressed Undo. */
  readonly onUndo: () => void;
  /** The window ended without Undo: commit the change. */
  readonly onExpire: () => void;
}
