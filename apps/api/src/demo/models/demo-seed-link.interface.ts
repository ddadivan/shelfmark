/** One link of the demo seed. Dates are offsets in days before the moment the demo is created. */
export interface DemoSeedLink {
  /** A real, public http(s) URL. It is never fetched. */
  url: string;
  title: string;
  /** One of `LINK_KIND` (checked by `demo-seed.spec.ts`); derived from the host when absent (the seed is never fetched). */
  kind?: string;
  note?: string;
  /** `key` of the folder, or `null` for an unsorted link. */
  folder: string | null;
  tags: string[];
  isFavorite: boolean;
  createdDaysAgo: number;
  lastOpenedDaysAgo: number | null;
}
