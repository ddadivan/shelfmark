import { TestBed } from '@angular/core/testing';
import { MOCK_SESSION_STORAGE_KEY } from '../../../core/auth/models/mock-session-storage-key.const';
import { MOCK_ADMIN_MODE } from '../../feedback/mock/models/mock-admin-mode.const';
import { MOCK_ADMIN_STORAGE_KEY } from '../../feedback/mock/models/mock-admin-storage-key.const';
import { MockAdminApi } from './mock-admin.api';
import { MOCK_ADMIN_STATS_ERROR_MESSAGE } from './models/mock-admin-stats-error-message.const';
import { MOCK_ADMIN_STATS_MODE } from './models/mock-admin-stats-mode.const';
import { MOCK_ADMIN_STATS_STORAGE_KEY } from './models/mock-admin-stats-storage-key.const';

describe('MockAdminApi stats', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      MOCK_SESSION_STORAGE_KEY,
      JSON.stringify({ id: 'u1', name: 'Ada', email: 'ada@example.com' }),
    );
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('answers the full fixture by default', async () => {
    const stats = await TestBed.inject(MockAdminApi).stats();
    expect(stats.overview.realUsers).toBe(47);
  });

  it('answers a shelf of two real users with sm-mock-admin-stats=few', async () => {
    localStorage.setItem(MOCK_ADMIN_STATS_STORAGE_KEY, MOCK_ADMIN_STATS_MODE.Few);
    const stats = await TestBed.inject(MockAdminApi).stats();
    expect(stats.overview.realUsers).toBe(2);
  });

  it('fails with sm-mock-admin-stats=fails', async () => {
    localStorage.setItem(MOCK_ADMIN_STATS_STORAGE_KEY, MOCK_ADMIN_STATS_MODE.Fails);
    await expect(TestBed.inject(MockAdminApi).stats()).rejects.toThrow(
      MOCK_ADMIN_STATS_ERROR_MESSAGE,
    );
  });

  it('never answers with sm-mock-admin-stats=slow', async () => {
    localStorage.setItem(MOCK_ADMIN_STATS_STORAGE_KEY, MOCK_ADMIN_STATS_MODE.Slow);
    const result = await Promise.race([
      TestBed.inject(MockAdminApi).stats(),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 20)),
    ]);
    expect(result).toBe('pending');
  });

  it('is a 404 for a regular user', async () => {
    localStorage.setItem(MOCK_ADMIN_STORAGE_KEY, MOCK_ADMIN_MODE.Off);
    await expect(TestBed.inject(MockAdminApi).stats()).rejects.toMatchObject({ status: 404 });
  });
});
