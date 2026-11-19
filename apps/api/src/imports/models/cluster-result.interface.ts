import type { VectorCluster } from './vector-cluster.interface';

/** The answer of `clusterVectors`. */
export interface ClusterResult {
  /** Largest first (ties: the one with the lowest first index). */
  clusters: VectorCluster[];
  /** Indexes that belong to no kept cluster, ascending. */
  rest: number[];
}
