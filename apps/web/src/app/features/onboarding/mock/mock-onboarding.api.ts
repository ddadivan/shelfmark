import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import type { OnboardingResponse } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MOCK_ONBOARDING_ERROR_MESSAGE } from './models/mock-onboarding-error-message.const';
import type { OnboardingApi } from '../models/onboarding-api.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * In-browser stand-in for the onboarding endpoints: rewrites `onboardingCompletedAt` of the
 * stored `sm-mock-session` user, so a reload keeps the answer.
 */
@Service()
export class MockOnboardingApi implements OnboardingApi {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  complete(): Promise<OnboardingResponse> {
    const onboardingCompletedAt = new Date().toISOString();
    return this.persist(onboardingCompletedAt).then(() => ({ onboardingCompletedAt }));
  }

  reset(): Promise<void> {
    return this.persist(null);
  }

  private persist(onboardingCompletedAt: string | null): Promise<void> {
    const raw = this.storage?.getItem(MOCK_SESSION_STORAGE_KEY);
    if (!raw) {
      return Promise.reject(new Error(MOCK_ONBOARDING_ERROR_MESSAGE));
    }
    try {
      const user: unknown = JSON.parse(raw);
      if (!isRecord(user)) {
        return Promise.reject(new Error(MOCK_ONBOARDING_ERROR_MESSAGE));
      }
      this.storage?.setItem(
        MOCK_SESSION_STORAGE_KEY,
        JSON.stringify({ ...user, onboardingCompletedAt }),
      );
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error(MOCK_ONBOARDING_ERROR_MESSAGE));
    }
  }
}
