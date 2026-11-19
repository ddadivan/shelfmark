/** One cluster of an import grouping as the naming prompt sees it: a key and a few samples. */
export interface ImportGroupNamesGroup {
  /** Short key (`g1`, `g2`, …); the model answers with it, never with an index or id. */
  key: string;
  /** Up to `IMPORT_GROUPING_LIMIT.SampleTitlesMax` titles of the cluster, closest to its centre first. */
  titles: string[];
  /** The most frequent hosts of the cluster, at most `IMPORT_GROUPING_LIMIT.SampleHostsMax`. */
  hosts: string[];
}
