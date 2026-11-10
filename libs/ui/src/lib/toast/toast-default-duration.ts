import { TOAST_DURATION_MS } from './models/toast-duration.const';
import { TOAST_KIND } from './models/toast-kind.const';
import type { ToastKind } from './models/toast-kind.type';

/**
 * The time a toast of this kind stays when `duration` is not given: a saved link 5 s; success 3 s
 * (a quick confirmation) and info and moved 4 s (status), or 8 s when they carry an action
 * (Undo); danger and warn stay until handled (errors, reminders). An Undo after a delete is
 * `danger` and passes `TOAST_DURATION_MS.Undo` itself.
 */
export function toastDefaultDuration(kind: ToastKind, hasAction: boolean): number {
  switch (kind) {
    case TOAST_KIND.Saved:
      return TOAST_DURATION_MS.Saved;
    case TOAST_KIND.Danger:
    case TOAST_KIND.Warn:
      return TOAST_DURATION_MS.Sticky;
    case TOAST_KIND.Success:
      return hasAction ? TOAST_DURATION_MS.Undo : TOAST_DURATION_MS.Quick;
    default:
      return hasAction ? TOAST_DURATION_MS.Undo : TOAST_DURATION_MS.Status;
  }
}
