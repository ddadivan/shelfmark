/** One link card of the hero's app preview (`landing.hero.preview.items.<id>`). */
export interface LandingPreviewCard {
  readonly id: string;
  readonly host: string;
  /** How long ago it was saved, in days; the card shows it relative ("2 days ago") or as a date. */
  readonly daysAgo: number;
  /** Which of the three soft preview backgrounds the drawing sits on. */
  readonly tone: number;
}
