/** The Settings › Language columns of `users` as Prisma returns them (`LANGUAGE_SELECT`). */
export interface LanguageRow {
  language: string;
  dateFormat: string;
  timeFormat: string;
  weekStart: string;
  spellcheck: boolean;
  languageSavedAt: Date | null;
}
