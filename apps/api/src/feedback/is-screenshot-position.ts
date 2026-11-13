import { FEEDBACK_MESSAGE_LIMIT } from '@shelfmark/contracts';

/** True for a position a screenshot can have (0 to `ScreenshotsMax - 1`). */
export function isScreenshotPosition(position: number): boolean {
  return (
    Number.isInteger(position) && position >= 0 && position < FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax
  );
}
