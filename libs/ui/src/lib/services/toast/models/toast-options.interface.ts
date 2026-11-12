import type { ToastAction } from './toast-action.interface';
import type { ToastFolder } from '../../../components/toast/models/toast-folder.interface';
import type { ToastKind } from '../../../components/toast/models/toast-kind.type';

export interface ToastOptions {
  /** What happened, one short sentence, already translated ("Saved to Work"). */
  readonly title: string;
  /** What it happened to, on a second line that truncates with an ellipsis ("Wool coat"). */
  readonly detail?: string;
  readonly kind: ToastKind;
  /** Preview image of a `saved` link (a same-origin URL); without it the lead shows an icon. */
  readonly thumb?: string;
  /** The tile of a `moved` toast; graphite by default. */
  readonly folder?: ToastFolder;
  /** The main action ("Undo", "View", "Retry"); it dismisses the toast first, then runs. */
  readonly action?: ToastAction;
  /** A quieter second action ("Later"); it dismisses the toast first, then runs. */
  readonly secondary?: ToastAction;
  /**
   * Milliseconds before it closes; 0 keeps it until it is handled. Default by kind (see
   * `toastDefaultDuration`): a toast whose duration is `TOAST_DURATION_MS.Undo` and that has an
   * action is an Undo toast (countdown line, Ctrl/⌘+Z).
   */
  readonly duration?: number;
  /**
   * Screen-reader hint announced with a toast that has an action, already translated
   * ("Press Alt+Shift+T to reach Undo"). Use `toastShortcutLabel()` for the key.
   */
  readonly actionHint?: string;
}
