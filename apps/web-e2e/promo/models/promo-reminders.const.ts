/**
 * The due note of reminders (#275, #465): the app shows it once per page load when a reminder
 * became due after `SeenKey` (REMINDERS_SEEN_STORAGE_KEY in apps/web; e2e code must not import
 * app code). The demo library has a due reminder, so the recorder sets `Never` before the demo
 * opens and before the account switch, and clears it for the one scene that shows the note.
 */
export const PROMO_REMINDERS = {
  SeenKey: 'sm-reminders-seen',
  /** Later than any reminder: no note. */
  Never: '9999-12-31T00:00:00.000Z',
} as const;
