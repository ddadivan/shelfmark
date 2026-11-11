/** Prisma `select` of the appearance columns (`AppearanceRow`). */
export const APPEARANCE_SELECT = {
  theme: true,
  customThemeBase: true,
  customThemeAccent: true,
  customThemeBackground: true,
  customThemeCorners: true,
  motion: true,
  appearanceSavedAt: true,
  textSize: true,
  font: true,
  density: true,
  cardPreview: true,
  cardSite: true,
  cardNotes: true,
  cardTags: true,
} as const;
