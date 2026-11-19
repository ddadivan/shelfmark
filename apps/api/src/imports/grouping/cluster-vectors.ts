import type { ClusterOptions } from '../models/cluster-options.interface';
import type { ClusterResult } from '../models/cluster-result.interface';
import type { VectorCluster } from '../models/vector-cluster.interface';

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

function normalized(vector: ArrayLike<number>): Float64Array {
  const out = Float64Array.from(vector);
  const norm = Math.sqrt(dot(out, out));
  if (norm > 0) for (let i = 0; i < out.length; i += 1) out[i] = (out[i] ?? 0) / norm;
  return out;
}

/** The index of the most similar centroid; ties go to the lowest index. */
function nearest(vector: Float64Array, centroids: readonly Float64Array[]): number {
  let best = 0;
  let bestSim = Number.NEGATIVE_INFINITY;
  centroids.forEach((centroid, index) => {
    const sim = dot(vector, centroid);
    if (sim > bestSim) {
      best = index;
      bestSim = sim;
    }
  });
  return best;
}

/**
 * Seeded farthest-point initialisation: the first vector is the first centroid, every next centroid
 * is the vector least similar to its nearest chosen centroid (ties: lowest index). No randomness.
 */
function seed(points: readonly Float64Array[], k: number): Float64Array[] {
  const first = points[0];
  if (first === undefined) return [];
  const centroids = [first];
  const best = points.map((point) => dot(point, first));
  best[0] = Number.POSITIVE_INFINITY;
  while (centroids.length < k) {
    let pick = -1;
    let pickSim = Number.POSITIVE_INFINITY;
    best.forEach((sim, index) => {
      if (sim < pickSim) {
        pick = index;
        pickSim = sim;
      }
    });
    const point = points[pick];
    if (point === undefined) break;
    centroids.push(point);
    points.forEach((other, index) => {
      if (index !== pick) best[index] = Math.max(best[index] ?? 0, dot(other, point));
    });
    // A vector that is a centroid now is never picked again.
    best[pick] = Number.POSITIVE_INFINITY;
  }
  return centroids;
}

/**
 * Deterministic spherical k-means (cosine similarity) over `vectors`: farthest-point seeding,
 * assignment to the most similar centroid, centroids as normalised means, until nothing moves or
 * `maxIterations`. Members below `floor` to their centroid go to `rest`, then clusters smaller than
 * `minSize` go to `rest` whole. Same input, same output (no randomness, ties by index).
 */
export function clusterVectors(
  vectors: readonly (readonly number[])[],
  options: ClusterOptions,
): ClusterResult {
  if (vectors.length === 0) return { clusters: [], rest: [] };
  const points = vectors.map((vector) => normalized(vector));
  const k = Math.min(Math.max(1, Math.floor(options.k)), points.length);
  let centroids = seed(points, k);
  let assignment = new Array<number>(points.length).fill(-1);
  for (let round = 0; round < options.maxIterations; round += 1) {
    const next = points.map((point) => nearest(point, centroids));
    const moved = next.some((cluster, index) => cluster !== assignment[index]);
    assignment = next;
    if (!moved) break;
    centroids = centroids.map((old, cluster) => {
      const sum = new Float64Array(old.length);
      let members = 0;
      points.forEach((point, index) => {
        if (assignment[index] !== cluster) return;
        members += 1;
        for (let i = 0; i < sum.length; i += 1) sum[i] = (sum[i] ?? 0) + (point[i] ?? 0);
      });
      return members === 0 ? old : normalized(sum);
    });
  }
  const clusters: VectorCluster[] = [];
  const rest: number[] = [];
  centroids.forEach((centroid, cluster) => {
    const members: { index: number; sim: number }[] = [];
    points.forEach((point, index) => {
      if (assignment[index] !== cluster) return;
      const sim = dot(point, centroid);
      if (sim >= options.floor) members.push({ index, sim });
      else rest.push(index);
    });
    if (members.length < options.minSize) {
      rest.push(...members.map((member) => member.index));
      return;
    }
    clusters.push({
      indexes: members.map((member) => member.index),
      closest: [...members]
        .sort((a, b) => b.sim - a.sim || a.index - b.index)
        .map((member) => member.index),
    });
  });
  clusters.sort(
    (a, b) => b.indexes.length - a.indexes.length || (a.indexes[0] ?? 0) - (b.indexes[0] ?? 0),
  );
  return { clusters, rest: rest.sort((a, b) => a - b) };
}
