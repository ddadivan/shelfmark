/** How the "Remind me" dialog ended: the new time (ISO) or `null` to remove the reminder. */
export interface RemindDialogResult {
  remindAt: string | null;
}
