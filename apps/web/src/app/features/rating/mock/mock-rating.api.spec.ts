import { TestBed } from '@angular/core/testing';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MockRatingApi } from './mock-rating.api';
import { MOCK_RATING_ERROR_MESSAGE } from './models/mock-rating-error-message.const';
import { MOCK_RATING_STORAGE_KEY } from './models/mock-rating-storage-key.const';

const DAY = 86_400_000;
const USER = { id: 'e2e', isDemo: false, onboardingCompletedAt: '2026-01-01T00:00:00.000Z' };

function signIn(user: Record<string, unknown> = USER): void {
  localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(user));
}

function seedCreated(daysAgo: number): void {
  localStorage.setItem(
    MOCK_RATING_STORAGE_KEY,
    JSON.stringify({ createdAt: new Date(Date.now() - daysAgo * DAY).toISOString() }),
  );
}

function stored(): { entries: Record<string, unknown> } {
  return JSON.parse(localStorage.getItem(MOCK_RATING_STORAGE_KEY) ?? '{}');
}

describe('MockRatingApi', () => {
  beforeEach(() => {
    localStorage.clear();
    signIn();
  });

  const create = () => TestBed.inject(MockRatingApi);

  it('starts the clock at the first prompt, so nothing is due at once', async () => {
    await expect(create().prompt()).resolves.toBeNull();

    expect(typeof (stored() as { createdAt?: string }).createdAt).toBe('string');
  });

  it('returns the latest reached milestone', async () => {
    seedCreated(10);

    await expect(create().prompt()).resolves.toBe('week1');
  });

  it.each([
    ['a demo user', { ...USER, isDemo: true }],
    ['a pending onboarding', { ...USER, onboardingCompletedAt: null }],
  ])('returns null for %s', async (_name, user) => {
    signIn(user);
    seedCreated(10);

    await expect(create().prompt()).resolves.toBeNull();
  });

  it('is done with a milestone once it has an answer, a skip included', async () => {
    seedCreated(4);
    await create().record({ milestone: 'day3', score: null });

    await expect(create().prompt()).resolves.toBeNull();
    expect(stored().entries).toEqual({ day3: { score: null } });
  });

  it('appends a comment for the same score and rejects another score', async () => {
    seedCreated(4);
    await create().record({ milestone: 'day3', score: 4 });
    await create().record({ milestone: 'day3', score: 4, comment: 'First' });
    await create().record({ milestone: 'day3', score: 4, comment: 'Second' });

    expect(stored().entries).toEqual({ day3: { score: 4, comment: 'First\n\nSecond' } });
    await expect(create().record({ milestone: 'day3', score: 9 })).rejects.toThrow(
      MOCK_RATING_ERROR_MESSAGE,
    );
  });

  it('rejects a milestone that is not reached yet', async () => {
    seedCreated(1);

    await expect(create().record({ milestone: 'day3', score: 8 })).rejects.toThrow(
      MOCK_RATING_ERROR_MESSAGE,
    );
  });
});
