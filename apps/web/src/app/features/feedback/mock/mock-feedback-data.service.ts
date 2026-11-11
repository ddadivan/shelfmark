import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { FEEDBACK_MESSAGE_KIND, FEEDBACK_STATUS } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MOCK_ADMIN_MODE } from './models/mock-admin-mode.const';
import { MOCK_ADMIN_STORAGE_KEY } from './models/mock-admin-storage-key.const';
import type { MockFeedbackEntry } from './models/mock-feedback-entry.interface';
import { MOCK_FEEDBACK_MESSAGES_STORAGE_KEY } from './models/mock-feedback-messages-storage-key.const';
import { MOCK_FEEDBACK_SCENARIO_STORAGE_KEY } from './models/mock-feedback-scenario-storage-key.const';
import type { MockFeedbackUser } from './models/mock-feedback-user.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKind(value: unknown): boolean {
  return Object.values<unknown>(FEEDBACK_MESSAGE_KIND).includes(value);
}

function isStatus(value: unknown): boolean {
  return Object.values<unknown>(FEEDBACK_STATUS).includes(value);
}

function isEntry(value: unknown): value is MockFeedbackEntry {
  if (!isRecord(value) || typeof value['userId'] !== 'string') {
    return false;
  }
  const message = value['message'];
  return (
    isRecord(message) &&
    typeof message['id'] === 'string' &&
    typeof message['text'] === 'string' &&
    typeof message['createdAt'] === 'string' &&
    isKind(message['kind']) &&
    isStatus(message['status']) &&
    isRecord(message['user'])
  );
}

/**
 * The shared `localStorage` state of the feedback mocks (the user's `MockFeedbackApi` and the
 * author's `MockAdminApi` read and write the same messages, so e2e can follow a message from one
 * to the other). The user is the stored `sm-mock-session`; the mock user is an admin unless
 * `sm-mock-admin` says `off` (and a demo user never is, like on the server).
 */
@Service()
export class MockFeedbackData {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  /** The signed-in mock user, or `null` without a session. */
  user(): MockFeedbackUser | null {
    try {
      const raw: unknown = JSON.parse(this.storage?.getItem(MOCK_SESSION_STORAGE_KEY) ?? 'null');
      if (isRecord(raw) && typeof raw['id'] === 'string') {
        return {
          id: raw['id'],
          name: typeof raw['name'] === 'string' ? raw['name'] : '',
          email: typeof raw['email'] === 'string' ? raw['email'] : '',
          isDemo: raw['isDemo'] === true,
        };
      }
    } catch {
      // An unreadable session counts as no session.
    }
    return null;
  }

  /** The stored value of `sm-mock-admin` (`off`, `save-fails`) or `null`. */
  adminMode(): string | null {
    return this.storage?.getItem(MOCK_ADMIN_STORAGE_KEY) ?? null;
  }

  /** The mock user is the author: signed in, not a demo user and not switched off. */
  isAdmin(): boolean {
    const user = this.user();
    return user !== null && !user.isDemo && this.adminMode() !== MOCK_ADMIN_MODE.Off;
  }

  /** The failure the mock answers to a send (`sm-mock-feedback-scenario`), or `null`. */
  scenario(): string | null {
    return this.storage?.getItem(MOCK_FEEDBACK_SCENARIO_STORAGE_KEY) ?? null;
  }

  /** Every stored message of every user, newest first. */
  entries(): MockFeedbackEntry[] {
    try {
      const raw: unknown = JSON.parse(
        this.storage?.getItem(MOCK_FEEDBACK_MESSAGES_STORAGE_KEY) ?? '[]',
      );
      if (Array.isArray(raw)) {
        return raw.filter(isEntry);
      }
    } catch {
      // A broken value is the same as none.
    }
    return [];
  }

  save(entries: readonly MockFeedbackEntry[]): void {
    this.storage?.setItem(MOCK_FEEDBACK_MESSAGES_STORAGE_KEY, JSON.stringify(entries));
  }
}
