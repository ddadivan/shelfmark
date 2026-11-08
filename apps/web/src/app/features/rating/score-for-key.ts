import type { FeedbackScore } from '@shelfmark/contracts';
import { RATING_SCORES } from './models/rating-scores.const';

/** `1`–`9` are their own score and `0` is 10; any other key is not a score. */
export function scoreForKey(key: string): FeedbackScore | null {
  if (key.length !== 1 || key < '0' || key > '9') {
    return null;
  }
  const value = key === '0' ? 10 : Number(key);
  return RATING_SCORES.find((score) => score === value) ?? null;
}
