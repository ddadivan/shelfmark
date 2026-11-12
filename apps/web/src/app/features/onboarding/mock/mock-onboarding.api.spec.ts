import { TestBed } from '@angular/core/testing';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MOCK_ONBOARDING_ERROR_MESSAGE } from './models/mock-onboarding-error-message.const';
import { MockOnboardingApi } from './mock-onboarding.api';

const USER = {
  id: 'e2e',
  name: 'E2E',
  email: 'e2e@example.com',
  image: null,
  isDemo: false,
  onboardingCompletedAt: null,
};

function stored(): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(MOCK_SESSION_STORAGE_KEY) ?? 'null') as Record<
    string,
    unknown
  >;
}

describe('MockOnboardingApi', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(USER));
  });

  const create = () => TestBed.inject(MockOnboardingApi);

  it('writes the completion time into the stored session and returns it', async () => {
    const { onboardingCompletedAt } = await create().complete();

    expect(typeof onboardingCompletedAt).toBe('string');
    expect(stored()).toEqual({ ...USER, onboardingCompletedAt });
  });

  it.each([null, 'not json', '[]'])('rejects when the session is %s', async (raw) => {
    localStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
    if (raw !== null) {
      localStorage.setItem(MOCK_SESSION_STORAGE_KEY, raw);
    }

    await expect(create().complete()).rejects.toThrow(MOCK_ONBOARDING_ERROR_MESSAGE);
  });
});
