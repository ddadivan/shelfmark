import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import {
  dueFeedbackMilestone,
  FEEDBACK_LIMIT,
  FEEDBACK_MILESTONE,
  reachedFeedbackMilestone,
  type FeedbackMilestone,
  type RecordFeedbackRequest,
} from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import type { RatingApi } from '../models/rating-api.interface';
import { MOCK_RATING_ERROR_MESSAGE } from './models/mock-rating-error-message.const';
import { MOCK_RATING_STORAGE_KEY } from './models/mock-rating-storage-key.const';
import type { MockRatingEntry } from './models/mock-rating-entry.interface';
import type { MockRatingState } from './models/mock-rating-state.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEntries(value: unknown): value is MockRatingState['entries'] {
  return isRecord(value) && Object.values(value).every((entry) => isRecord(entry));
}

function isMilestone(value: string): value is FeedbackMilestone {
  return Object.values<string>(FEEDBACK_MILESTONE).includes(value);
}

/**
 * In-browser stand-in for the feedback endpoints, with the server's rules: nothing for a demo
 * user or while the onboarding is pending, otherwise the latest reached milestone without an
 * answer. The sign-up time is `createdAt` in `localStorage` (`sm-mock-feedback`); when it is
 * missing it is set to now at the first prompt, so a new mock user is asked after 3 days.
 */
@Service()
export class MockRatingApi implements RatingApi {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  prompt(): Promise<FeedbackMilestone | null> {
    if (!this.eligible()) {
      return Promise.resolve(null);
    }
    const state = this.read();
    if (state.createdAt === undefined) {
      state.createdAt = new Date().toISOString();
      this.save(state);
    }
    const answered = new Set(Object.keys(state.entries).filter(isMilestone));
    return Promise.resolve(dueFeedbackMilestone(new Date(state.createdAt), new Date(), answered));
  }

  record(request: RecordFeedbackRequest): Promise<void> {
    const state = this.read();
    if (!this.eligible() || state.createdAt === undefined) {
      return Promise.reject(new Error(MOCK_RATING_ERROR_MESSAGE));
    }
    const reached = reachedFeedbackMilestone(new Date(state.createdAt), new Date());
    if (reached === null || !isMilestone(request.milestone)) {
      return Promise.reject(new Error(MOCK_RATING_ERROR_MESSAGE));
    }
    const existing = state.entries[request.milestone];
    if (existing && existing.score !== request.score) {
      return Promise.reject(new Error(MOCK_RATING_ERROR_MESSAGE));
    }
    const entry: MockRatingEntry = { score: request.score };
    const comment = [existing?.comment, request.comment].filter(Boolean).join('\n\n');
    if (request.score !== null && comment !== '') {
      entry.comment = comment.slice(0, FEEDBACK_LIMIT.CommentMax);
    }
    state.entries[request.milestone] = entry;
    this.save(state);
    return Promise.resolve();
  }

  private eligible(): boolean {
    const raw = this.storage?.getItem(MOCK_SESSION_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    try {
      const user: unknown = JSON.parse(raw);
      return (
        isRecord(user) &&
        user['isDemo'] !== true &&
        typeof user['onboardingCompletedAt'] === 'string'
      );
    } catch {
      return false;
    }
  }

  private read(): MockRatingState {
    const state: MockRatingState = { entries: {} };
    try {
      const parsed: unknown = JSON.parse(this.storage?.getItem(MOCK_RATING_STORAGE_KEY) ?? 'null');
      if (isRecord(parsed)) {
        if (typeof parsed['createdAt'] === 'string') {
          state.createdAt = parsed['createdAt'];
        }
        if (isEntries(parsed['entries'])) {
          state.entries = parsed['entries'];
        }
      }
    } catch {
      // A broken value is the same as none.
    }
    return state;
  }

  private save(state: MockRatingState): void {
    this.storage?.setItem(MOCK_RATING_STORAGE_KEY, JSON.stringify(state));
  }
}
