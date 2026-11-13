import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_SCREENSHOT_ERROR_MESSAGE,
  FEEDBACK_STATUS,
  feedbackScreenshotsPath,
  type AdminFeedbackItem,
  type FeedbackMessage,
  type FeedbackScreenshotUpload,
  type SendFeedbackRequest,
} from '@shelfmark/contracts';
import { MS_PER_HOUR } from '../../../core/models/ms-per-hour.const';
import { feedbackScreenshotType } from '../utils/feedback-screenshot-problem';
import { FeedbackSendError } from '../utils/feedback-send-error';
import type { FeedbackApi } from '../models/feedback-api.interface';
import { FEEDBACK_SEND_ERROR_REASON } from '../models/feedback-send-error-reason.const';
import { MockFeedbackData } from './mock-feedback-data.service';
import { MOCK_FEEDBACK_SCENARIO } from './models/mock-feedback-scenario.const';

const BASE64_RATIO = 3 / 4;
/** The longest base64 a preview keeps in `localStorage` (about 256 KB of image). */
const PREVIEW_MAX_CHARS = 350_000;
/** The signature (magic bytes) of each type, as the API checks it. */
const SIGNATURE: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) =>
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
};
const HEAD_CHARS = 16;

function rejectWith(status: number, message?: string): Promise<never> {
  return Promise.reject(
    new HttpErrorResponse({ status, error: message === undefined ? null : { message } }),
  );
}

/** Size and signature checks of the API, on the base64 of one screenshot. */
function validScreenshot(upload: FeedbackScreenshotUpload): boolean {
  const check = SIGNATURE[upload.type];
  if (feedbackScreenshotType(upload.type) === null || check === undefined || upload.data === '') {
    return false;
  }
  if (upload.data.length * BASE64_RATIO > FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes) {
    return false;
  }
  try {
    const head = atob(upload.data.slice(0, HEAD_CHARS));
    return check(Uint8Array.from(head, (char) => char.charCodeAt(0)));
  } catch {
    return false;
  }
}

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
    screenshotUrls: message.screenshotUrls,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

/**
 * In-browser stand-in for `/api/feedback/messages`, with the server's rules (text 1 to 2000
 * characters after trimming, up to three screenshots attached right after sending with type,
 * signature and size checked, an owner-only list). A new message is `received` with no reply. `sm-mock-feedback-scenario` makes a send fail with 429 or 500 (e2e).
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
        .slice(0, FEEDBACK_MESSAGE_LIMIT.ListMax)
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
    // Like the API: at most `PerHourMax` messages per rolling hour and user.
    const hourAgo = Date.now() - MS_PER_HOUR;
    const lastHour = this.data
      .entries()
      .filter((entry) => entry.userId === user.id && Date.parse(entry.message.createdAt) > hourAgo);
    if (lastHour.length >= FEEDBACK_MESSAGE_LIMIT.PerHourMax) {
      return Promise.reject(new FeedbackSendError(FEEDBACK_SEND_ERROR_REASON.RateLimited));
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const message: AdminFeedbackItem = {
      id,
      kind: request.kind,
      text,
      status: FEEDBACK_STATUS.Received,
      reply: null,
      screenshotUrls: [],
      createdAt: now,
      updatedAt: now,
      user: { name: user.name, email: user.email },
    };
    this.data.save([{ userId: user.id, message }, ...this.data.entries()]);
    return Promise.resolve(forUser(message));
  }

  attachScreenshot(id: string, upload: FeedbackScreenshotUpload): Promise<FeedbackMessage> {
    const user = this.data.user();
    const entries = this.data.entries();
    const entry = entries.find((item) => item.message.id === id && item.userId === user?.id);
    if (user === null || entry === undefined) {
      return rejectWith(HttpStatusCode.NotFound);
    }
    if (!validScreenshot(upload)) {
      return rejectWith(HttpStatusCode.BadRequest);
    }
    const count = entry.message.screenshotUrls.length;
    if (count >= FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax) {
      return rejectWith(HttpStatusCode.BadRequest, FEEDBACK_SCREENSHOT_ERROR_MESSAGE.TooMany);
    }
    if (
      Date.now() - Date.parse(entry.message.createdAt) >
      FEEDBACK_MESSAGE_LIMIT.ScreenshotAttachWindowMs
    ) {
      return rejectWith(HttpStatusCode.BadRequest, FEEDBACK_SCREENSHOT_ERROR_MESSAGE.TooLate);
    }
    const preview =
      upload.data.length <= PREVIEW_MAX_CHARS ? `data:${upload.type};base64,${upload.data}` : null;
    const updated = {
      ...entry,
      message: {
        ...entry.message,
        screenshotUrls: [
          ...entry.message.screenshotUrls,
          `${feedbackScreenshotsPath(id)}/${count}`,
        ],
      },
      previews: [...(entry.previews ?? []), preview],
    };
    this.data.save(entries.map((item) => (item === entry ? updated : item)));
    return Promise.resolve(forUser(updated.message));
  }
}
