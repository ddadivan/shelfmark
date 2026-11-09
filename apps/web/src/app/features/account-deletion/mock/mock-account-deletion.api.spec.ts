import { TestBed } from '@angular/core/testing';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MockAccountDeletionApi } from './mock-account-deletion.api';
import { MOCK_ACCOUNT_DELETION_SCENARIO } from './models/mock-account-deletion-scenario.const';
import { MOCK_ACCOUNT_DELETION_SCENARIO_STORAGE_KEY } from './models/mock-account-deletion-scenario-storage-key.const';

const USER = { id: 'e2e', name: 'E2E', email: 'e2e@example.com', image: null, isDemo: false };

describe('MockAccountDeletionApi', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(USER));
  });
  afterEach(() => localStorage.clear());

  const create = () => TestBed.inject(MockAccountDeletionApi);

  it('ends the stored session when the email matches, ignoring case', async () => {
    await create().delete({ email: 'E2E@Example.com' });

    expect(localStorage.getItem(MOCK_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('answers 400 for another email and keeps the session', async () => {
    await expect(create().delete({ email: 'other@example.com' })).rejects.toMatchObject({
      status: 400,
    });

    expect(localStorage.getItem(MOCK_SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it('answers 401 without a session', async () => {
    localStorage.removeItem(MOCK_SESSION_STORAGE_KEY);

    await expect(create().delete({ email: USER.email })).rejects.toMatchObject({ status: 401 });
  });

  it('answers 429 and 500 for the e2e scenarios and keeps the session', async () => {
    localStorage.setItem(
      MOCK_ACCOUNT_DELETION_SCENARIO_STORAGE_KEY,
      MOCK_ACCOUNT_DELETION_SCENARIO.RateLimited,
    );
    await expect(create().delete({ email: USER.email })).rejects.toMatchObject({ status: 429 });
    localStorage.setItem(
      MOCK_ACCOUNT_DELETION_SCENARIO_STORAGE_KEY,
      MOCK_ACCOUNT_DELETION_SCENARIO.ServerError,
    );
    await expect(create().delete({ email: USER.email })).rejects.toMatchObject({ status: 500 });

    expect(localStorage.getItem(MOCK_SESSION_STORAGE_KEY)).not.toBeNull();
  });
});
