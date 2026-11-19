/** One cluster of `clusterVectors`. */
export interface VectorCluster {
  /** Indexes of the members, ascending. */
  indexes: number[];
  /** The same indexes, the closest to the centroid first (ties by index). */
  closest: number[];
}
