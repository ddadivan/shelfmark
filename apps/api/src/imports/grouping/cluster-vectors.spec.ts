import { clusterVectors } from './cluster-vectors';

const OPTIONS = { k: 2, minSize: 2, floor: 0.5, maxIterations: 15 };

/** Unit-ish vectors along `axis` of a 4-dimensional space with a little `tilt` on the next one. */
const near = (axis: number, tilt = 0): number[] => {
  const vector = [0, 0, 0, 0];
  vector[axis] = 1;
  vector[(axis + 1) % 4] = tilt;
  return vector;
};

describe('clusterVectors', () => {
  it('answers nothing for no vectors', () => {
    expect(clusterVectors([], OPTIONS)).toEqual({ clusters: [], rest: [] });
  });

  it('splits two directions, largest cluster first, indexes ascending', () => {
    const vectors = [near(1), near(0), near(1, 0.1), near(0, 0.1), near(0, 0.2), near(1, 0.05)];
    const { clusters, rest } = clusterVectors(vectors, OPTIONS);
    expect(rest).toEqual([]);
    expect(clusters.map((cluster) => cluster.indexes)).toEqual([
      [0, 2, 5],
      [1, 3, 4],
    ]);
    // The closest member is the one nearest the mean tilt (index 5, 0.05).
    expect(clusters[0]?.closest[0]).toBe(5);
    expect(clusters[0]?.closest).toHaveLength(3);
  });

  it('is deterministic: the same input gives the same answer', () => {
    const vectors = Array.from({ length: 30 }, (_, i) => near(i % 4, (i % 7) / 10));
    const options = { ...OPTIONS, k: 3, floor: 0.3 };
    expect(clusterVectors(vectors, options)).toEqual(clusterVectors(vectors, options));
  });

  it('puts a member below the similarity floor into rest', () => {
    const vectors = [
      near(0),
      near(0, 0.1),
      near(0, 0.2),
      near(1),
      near(1, 0.1),
      near(1, 0.2),
      [0.5, 0.5, 0.5, 0.5],
    ];
    const { clusters, rest } = clusterVectors(vectors, { ...OPTIONS, floor: 0.8 });
    expect(rest).toEqual([6]);
    expect(clusters.flatMap((cluster) => cluster.indexes).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('puts a cluster smaller than the minimum into rest', () => {
    const vectors = [near(0), near(0, 0.1), near(0, 0.2), near(2)];
    const { clusters, rest } = clusterVectors(vectors, { ...OPTIONS, minSize: 2 });
    expect(clusters.map((cluster) => cluster.indexes)).toEqual([[0, 1, 2]]);
    expect(rest).toEqual([3]);
  });

  it('clamps k to the number of vectors and keeps every index in one place only', () => {
    const vectors = [near(0), near(1)];
    const { clusters, rest } = clusterVectors(vectors, { ...OPTIONS, k: 9, minSize: 1 });
    const all = [...clusters.flatMap((cluster) => cluster.indexes), ...rest].sort();
    expect(all).toEqual([0, 1]);
  });

  it('copes with identical and zero vectors', () => {
    const vectors = [near(0), near(0), near(0), [0, 0, 0, 0]];
    const { clusters, rest } = clusterVectors(vectors, {
      ...OPTIONS,
      k: 2,
      minSize: 1,
      floor: 0.5,
    });
    const all = [...clusters.flatMap((cluster) => cluster.indexes), ...rest].sort();
    expect(all).toEqual([0, 1, 2, 3]);
    expect(rest).toContain(3);
  });
});
