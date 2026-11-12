import { feedbackScreenshotProblem, feedbackScreenshotType } from './feedback-screenshot-problem';
import { FEEDBACK_SCREENSHOT_ERROR } from '../models/feedback-screenshot-error.const';
import type { FeedbackScreenshotAttachment } from '../models/feedback-screenshot-attachment.interface';
import type { FeedbackScreenshotError } from '../models/feedback-screenshot-error.type';

const BASE64_MARKER = ';base64,';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unexpected FileReader result'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('FileReader failed'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validates a chosen file (`feedbackScreenshotProblem`) and reads it: the base64 body for the
 * contract and a `data:` URL for the thumbnail (one read gives both). Resolves with the reason
 * when the file is not accepted or cannot be read.
 */
export async function readFeedbackScreenshot(
  file: File,
): Promise<FeedbackScreenshotAttachment | FeedbackScreenshotError> {
  const problem = feedbackScreenshotProblem(file);
  const type = feedbackScreenshotType(file.type);
  if (problem !== null || type === null) {
    return problem ?? FEEDBACK_SCREENSHOT_ERROR.Type;
  }
  try {
    const previewUrl = await readAsDataUrl(file);
    const start = previewUrl.indexOf(BASE64_MARKER);
    if (start === -1) {
      return FEEDBACK_SCREENSHOT_ERROR.Read;
    }
    return {
      upload: { type, data: previewUrl.slice(start + BASE64_MARKER.length) },
      name: file.name,
      size: file.size,
      previewUrl,
    };
  } catch {
    return FEEDBACK_SCREENSHOT_ERROR.Read;
  }
}
