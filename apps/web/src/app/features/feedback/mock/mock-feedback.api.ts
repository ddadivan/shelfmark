import { inject, Service } from '@angular/core';
import {
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_STATUS,
  type FeedbackMessage,
  type SendFeedbackRequest,
  type AdminFeedbackItem,
  FEEDBACK_ENDPOINT,
} from '@shelfmark/contracts';
import { feedbackScreenshotType } from '../utils/feedback-screenshot-problem';
import { FeedbackSendError } from '../utils/feedback-send-error';
import type { FeedbackApi } from '../models/feedback-api.interface';
import { FEEDBACK_SEND_ERROR_REASON } from '../models/feedback-send-error-reason.const';
import { MockFeedbackData } from './mock-feedback-data.service';
import { MOCK_FEEDBACK_SCENARIO } from './models/mock-feedback-scenario.const';

/** At most this many messages come back, like the API. */
const LIST_MAX = 100;
const BASE64_RATIO = 3 / 4;

function failed(): Promise<never> {
  return Promise.reject(new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.Failed));
}

/** The message a user sees: the admin fields are left out. */
function forUser(message: AdminFeedbackItem): FeedbackMessage {
  return {
    id: message.id,
    kind: message.kind,
    text: message.text,
    status: message.status,
    reply: message.reply,
    screenshotUrl: message.screenshotUrl,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

/**
 * In-browser stand-in for `/api/feedback/messages`, with the server's rules (text 1 to 2000
 * characters after trimming, screenshot type and size, an owner-only list). A new message is
 * `received` with no reply. `sm-mock-feedback-scenario` makes a send fail with 429 or 500 (e2e).
 * The messages live in `MockFeedbackData`, shared with the admin mock.
 */
@Service()
export class MockFeedbackApi implements FeedbackApi {
  private readonly data = inject(MockFeedbackData);

  list(): Promise<FeedbackMessage[]> {
    const user = this.data.user();
    if (user === null) {
      return Promise.reject(new Error('Mock: not signed in'));
    }
    return Promise.resolve(
      this.data
        .entries()
        .filter((entry) => entry.userId === user.id)
        .slice(0, LIST_MAX)
        .map((entry) => forUser(entry.message)),
    );
  }

  send(request: SendFeedbackRequest): Promise<FeedbackMessage> {
    const user = this.data.user();
    if (user === null) {
      return failed();
    }
    switch (this.data.scenario()) {
      case MOCK_FEEDBACK_SCENARIO.RateLimited:
        return Promise.reject(new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.RateLimited));
      case MOCK_FEEDBACK_SCENARIO.ServerError:
        return failed();
      default:
        break;
    }
    const text = request.text.trim();
    const kindKnown = Object.values<string>(FEEDBACK_MESSAGE_KIND).includes(request.kind);
    if (!kindKnown || text === '' || text.length > FEEDBACK_MESSAGE_LIMIT.TextMax) {
      return failed();
    }
    if (request.screenshot) {
      const bytes = request.screenshot.data.length * BASE64_RATIO;
      if (
        feedbackScreenshotType(request.screenshot.type) === null ||
        bytes > FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes
      ) {
        return failed();
      }
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const message: AdminFeedbackItem = {
      id,
      kind: request.kind,
      text,
      status: FEEDBACK_STATUS.Received,
      reply: null,
      screenshotUrl: request.screenshot ? `${FEEDBACK_ENDPOINT.Messages}/${id}/screenshot` : null,
      createdAt: now,
      updatedAt: now,
      user: { name: user.name, email: user.email },
    };
    this.data.save([{ userId: user.id, message }, ...this.data.entries()]);
    return Promise.resolve(forUser(message));
  }
}
