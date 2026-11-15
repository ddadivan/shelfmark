/** What the "Remind me" dialog needs (#275). */
export interface RemindDialogData {
  /** "Remind me" for one link, "Remind me about 3 links" for a selection. */
  heading: string;
  /** The title of the one link (under the heading); none for a selection. */
  subtitle?: string;
  /** The current reminder of the one link, ISO; offers "Remove reminder". */
  current: string | null;
}
