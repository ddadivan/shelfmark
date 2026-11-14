/** The quick choices of "Remind me" and "Snooze" (#275), each a local time computed from now. */
export const REMIND_PRESET = {
  /** Today at 18:00; offered until 17:00. */
  LaterToday: 'later-today',
  /** Tomorrow at 9:00. */
  Tomorrow: 'tomorrow',
  /** The coming Saturday at 10:00; offered Monday to Friday. */
  Weekend: 'weekend',
  /** The coming Monday at 9:00 (from a Sunday, the Monday after tomorrow). */
  NextWeek: 'next-week',
  /** The same day next month at 9:00. */
  InMonth: 'in-month',
} as const;
