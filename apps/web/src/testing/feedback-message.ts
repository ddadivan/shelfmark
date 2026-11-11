import {
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_STATUS,
  type FeedbackMessage,
  type AdminFeedbackItem,
} from '@shelfmark/contracts';

/** A feedback message for specs; override what a test cares about. */
export function feedbackMessage(overrides: Partial<FeedbackMessage> = {}): FeedbackMessage {
  return {
    id: 'm1',
    kind: FEEDBACK_MESSAGE_KIND.Idea,
    text: 'Sort a folder by when I last opened a link',
    status: FEEDBACK_STATUS.Received,
    reply: null,
    screenshotUrl: null,
    createdAt: '2026-11-10T09:00:00.000Z',
    updatedAt: '2026-11-10T09:00:00.000Z',
    ...overrides,
  };
}

/** The same message as the admin inbox lists it. */
export function adminFeedbackMessage(
  overrides: Partial<AdminFeedbackItem> = {},
): AdminFeedbackItem {
  return {
    ...feedbackMessage(),
    user: { name: 'Ada Lovelace', email: 'ada@example.com' },
    ...overrides,
  };
}
