/** The status next to the "Search by meaning" switch: a translation key and its raw values. */
export interface MeaningStatusLine {
  readonly key: string;
  /** Numbers (`ready`, `total`) or the ISO reset day (`date`); the caller formats them. */
  readonly ready?: number;
  readonly total?: number;
  readonly date?: string;
}
