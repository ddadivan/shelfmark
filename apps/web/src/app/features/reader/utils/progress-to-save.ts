import { READER_LIMIT } from '@shelfmark/contracts';

/** A new share is kept once it moved this far from the last kept one (or finished the text). */
const SAVE_STEP = 0.05;

/**
 * Whether a Reader scroll position is worth storing: past the start, and a step away from the last
 * stored share, or the text was just finished.
 */
export function progressToSave(share: number, last: number | null): boolean {
  if (share < READER_LIMIT.StartedFraction) {
    return false;
  }
  if (last === null) {
    return true;
  }
  if (share >= READER_LIMIT.DoneFraction && last < READER_LIMIT.DoneFraction) {
    return true;
  }
  // The epsilon keeps 0.15 - 0.1 (0.04999…) a full step.
  return Math.abs(share - last) >= SAVE_STEP - 1e-9;
}
