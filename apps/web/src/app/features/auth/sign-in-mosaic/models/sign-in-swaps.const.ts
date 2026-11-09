/**
 * Pairs of tile indexes that trade places, one pair every few seconds, in a loop. Index 4 stands
 * for "the tile in the wide slot" (see `swapTiles`).
 */
export const SIGN_IN_SWAPS: readonly (readonly [number, number])[] = [
  [4, 0],
  [2, 6],
  [4, 7],
  [1, 3],
  [4, 2],
  [5, 7],
  [4, 1],
  [0, 6],
];
