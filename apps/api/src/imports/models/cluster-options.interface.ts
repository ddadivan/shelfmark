/** What `clusterVectors` needs: how many clusters to try and when a cluster or a member is dropped. */
export interface ClusterOptions {
  /** Clusters to try (clamped to the number of vectors). */
  k: number;
  /** A cluster with fewer members after the floor is dropped into `rest`. */
  minSize: number;
  /** Cosine similarity to its centroid below which a member goes to `rest`. */
  floor: number;
  maxIterations: number;
}
