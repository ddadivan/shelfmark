import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import type { AuthProvider, AuthUser } from '@shelfmark/contracts';
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
    return Promise.resolve(this.persist(MOCK_DEMO_USER));
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
