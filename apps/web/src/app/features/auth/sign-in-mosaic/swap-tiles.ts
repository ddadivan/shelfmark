import { SIGN_IN_SLOT } from './models/sign-in-slot.const';
import type { SignInSlot } from './models/sign-in-slot.type';

const WIDE_INDEX = 4;
const COUNT = 8;

/**
 * Trades the slots of two tiles. Index 4 means "whichever tile sits in the wide slot `e`", so the
 * wide slot keeps trading too; the two never collapse onto the same tile.
 */
export function swapTiles(
  slots: readonly SignInSlot[],
  pair: readonly [number, number],
): SignInSlot[] {
  const next = [...slots];
  const wideAt = next.indexOf(SIGN_IN_SLOT.E);
  const [x, y] = pair;
  const a = x === WIDE_INDEX ? wideAt : x;
  let b = y === wideAt ? (y + 1) % COUNT : y;
  if (a === b) {
    b = (b + 1) % COUNT;
  }
  const first = next[a];
  const second = next[b];
  if (first !== undefined && second !== undefined) {
    next[a] = second;
    next[b] = first;
  }
  return next;
}
