import { FEEDBACK_MESSAGE_LIMIT } from '@shelfmark/contracts';
import { feedbackScreenshotProblem, feedbackScreenshotType } from './feedback-screenshot-problem';
import { FEEDBACK_SCREENSHOT_ERROR } from '../models/feedback-screenshot-error.const';

const MAX = FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes;

describe('feedbackScreenshotProblem', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('accepts %s', (type) => {
    expect(feedbackScreenshotProblem({ type, size: 1000 })).toBeNull();
    expect(feedbackScreenshotType(type)).toBe(type);
  });

  it.each(['image/gif', 'image/svg+xml', 'application/pdf', ''])('rejects the type %j', (type) => {
    expect(feedbackScreenshotProblem({ type, size: 1000 })).toBe(FEEDBACK_SCREENSHOT_ERROR.Type);
    expect(feedbackScreenshotType(type)).toBeNull();
  });

  it('accepts exactly 2 MB and rejects one byte more', () => {
    expect(feedbackScreenshotProblem({ type: 'image/png', size: MAX })).toBeNull();
    expect(feedbackScreenshotProblem({ type: 'image/png', size: MAX + 1 })).toBe(
      FEEDBACK_SCREENSHOT_ERROR.Size,
    );
  });

  it('rejects an empty file and names the type first', () => {
    expect(feedbackScreenshotProblem({ type: 'image/png', size: 0 })).toBe(
      FEEDBACK_SCREENSHOT_ERROR.Empty,
    );
    expect(feedbackScreenshotProblem({ type: 'text/plain', size: MAX + 1 })).toBe(
      FEEDBACK_SCREENSHOT_ERROR.Type,
    );
  });
});
