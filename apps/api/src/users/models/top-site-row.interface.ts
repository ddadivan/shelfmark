/** A row of the top sites query of `MeStatsService`. */
export interface TopSiteRow {
  host: string;
  count: number;
  linkId: string | null;
  sha256: string | null;
}
