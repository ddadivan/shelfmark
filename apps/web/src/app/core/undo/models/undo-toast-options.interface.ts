import type { ToastFolder, ToastKind } from '@shelfmark/ui';

/** Options of `UndoToastService.show()`; texts are already translated. */
export interface UndoToastOptions {
  /** What happened ("Link deleted"). */
  readonly title: string;
  /** What it happened to, on a second line (the link's title). */
  readonly detail?: string;
  /** The toast's look; Danger (red) by default, as for a delete. */
  readonly kind?: ToastKind;
  /** The tile of a `moved` toast. */
  readonly folder?: ToastFolder;
  readonly actionLabel: string;
  /** The user pressed Undo. */
  readonly onUndo: () => void;
  /** The window ended without Undo: commit the change. Without it nothing runs on expiry. */
  readonly onExpire?: () => void;
}
