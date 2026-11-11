import {
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_SCREENSHOT_TYPES,
  type FeedbackScreenshotType,
} from '@shelfmark/contracts';
import { FEEDBACK_SCREENSHOT_ERROR } from './models/feedback-screenshot-error.const';
import type { FeedbackScreenshotError } from './models/feedback-screenshot-error.type';

/** The contract type of a file, or `null` when it is not a PNG, JPEG or WebP image. */
export function feedbackScreenshotType(type: string): FeedbackScreenshotType | null {
  return FEEDBACK_SCREENSHOT_TYPES.find((allowed) => allowed === type) ?? null;
}

/**
 * Why a file cannot be the screenshot (type first, then size), or `null` when it can. Checked in
 * the browser before anything is read or sent; the API checks again, including the signature.
 */
export function feedbackScreenshotProblem(file: {
  type: string;
  size: number;
}): FeedbackScreenshotError | null {
  if (feedbackScreenshotType(file.type) === null) {
    return FEEDBACK_SCREENSHOT_ERROR.Type;
  }
  if (file.size === 0) {
    return FEEDBACK_SCREENSHOT_ERROR.Empty;
  }
  if (file.size > FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes) {
    return FEEDBACK_SCREENSHOT_ERROR.Size;
  }
  return null;
}
