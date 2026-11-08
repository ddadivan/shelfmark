import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import { DEMO_LIMIT, type AuthProvider, type AuthUser } from '@shelfmark/contracts';
import { MS_PER_HOUR } from '../models/ms-per-hour.const';
import { DemoSignInError } from './demo-sign-in-error';
import { DEMO_ERROR } from './models/demo-error.const';
import { MOCK_DEMO_FAILURE_STORAGE_KEY } from './models/mock-demo-failure-storage-key.const';
import { AuthApi } from './models/auth-api.interface';
import { LEGACY_ONBOARDING_COMPLETED_AT } from './models/legacy-onboarding-completed-at.const';
import { StoredUser } from './models/stored-user.interface';
import { MOCK_DEMO_USER } from './models/mock-demo-user.const';
import { MOCK_USERS } from './models/mock-users.const';
import { MOCK_SESSION_STORAGE_KEY } from './models/mock-session-storage-key.const';

function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<keyof AuthUser, unknown>>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.image === null || typeof candidate.image === 'string') &&
    typeof candidate.isDemo === 'boolean' &&
    (candidate.demoExpiresAt === undefined ||
      candidate.demoExpiresAt === null ||
      typeof candidate.demoExpiresAt === 'string') &&
    (candidate.onboardingCompletedAt === undefined ||
      candidate.onboardingCompletedAt === null ||
      typeof candidate.onboardingCompletedAt === 'string')
  );
}

/**
 * In-browser stand-in for the real auth API. Starts signed out; the session is one JSON user in
 * `localStorage` under `sm-mock-session`, so a reload keeps it and e2e can seed it. No network.
 */
@Service()
export class MockAuthApi implements AuthApi {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  getSession(): Promise<AuthUser | null> {
    return Promise.resolve(this.restore());
  }

  signIn(provider: AuthProvider): Promise<AuthUser> {
    return Promise.resolve(this.persist(MOCK_USERS[provider]));
  }

  signInDemo(): Promise<AuthUser> {
    const failure = this.storage?.getItem(MOCK_DEMO_FAILURE_STORAGE_KEY);
    if (failure === DEMO_ERROR.RateLimited || failure === DEMO_ERROR.Unavailable) {
      return Promise.reject(new DemoSignInError(failure));
    }
    return Promise.resolve(
      this.persist({
        ...MOCK_DEMO_USER,
        demoExpiresAt: new Date(Date.now() + DEMO_LIMIT.SessionHours * MS_PER_HOUR).toISOString(),
      }),
    );
  }

  signOut(): Promise<void> {
    this.storage?.removeItem(MOCK_SESSION_STORAGE_KEY);
    return Promise.resolve();
  }

  private restore(): AuthUser | null {
    const raw = this.storage?.getItem(MOCK_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isStoredUser(parsed)) {
        return null;
      }
      return {
        ...parsed,
        demoExpiresAt: parsed.demoExpiresAt ?? null,
        onboardingCompletedAt:
          parsed.onboardingCompletedAt === undefined
            ? LEGACY_ONBOARDING_COMPLETED_AT
            : parsed.onboardingCompletedAt,
      };
    } catch {
      return null;
    }
  }

  private persist(user: AuthUser): AuthUser {
    this.storage?.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(user));
    return user;
  }
}
