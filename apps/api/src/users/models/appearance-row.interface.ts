/** The appearance columns of `users` as Prisma returns them (`APPEARANCE_SELECT`). */
export interface AppearanceRow {
  theme: string;
  customThemeBase: string;
  customThemeAccent: string;
  customThemeBackground: string;
  customThemeCorners: string;
  customColours: string[];
  customEmoji: string[];
  motion: string;
  appearanceSavedAt: Date | null;
  textSize: string;
  font: string;
  density: string;
  cardPreview: string;
  cardSite: boolean;
  cardNotes: boolean;
  cardTags: boolean;
}
