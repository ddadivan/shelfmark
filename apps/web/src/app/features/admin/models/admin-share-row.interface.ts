/** One labelled share on the stats page: a meter and its text, already translated. */
export interface AdminShareRow {
  key: string;
  label: string;
  /** 0 to 100 for the meter; `null` while the share is hidden. */
  percent: number | null;
  /** "38% · 18 of 47", or why it is hidden. */
  text: string;
}
