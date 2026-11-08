/** One link of the demo seed. Dates are offsets in days before the moment the demo is created. */
export interface DemoSeedLink {
  /** A real, public http(s) URL. It is never fetched. */
  url: string;
  title: string;
  note?: string;
  /** `key` of the folder, or `null` for an unsorted link. */
  folder: string | null;
  tags: string[];
  isFavorite: boolean;
  createdDaysAgo: number;
  lastOpenedDaysAgo: number | null;
}
