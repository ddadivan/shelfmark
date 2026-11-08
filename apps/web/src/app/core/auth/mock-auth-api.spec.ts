import { TestBed } from '@angular/core/testing';
import { MockAuthApi } from './mock-auth-api';
import { AUTH_PROVIDER } from '@shelfmark/contracts';
import { MOCK_SESSION_STORAGE_KEY } from './models/mock-session-storage-key.const';

describe('MockAuthApi', () => {
  beforeEach(() => localStorage.clear());

  const create = () => TestBed.inject(MockAuthApi);

  it('starts signed out', async () => {
    expect(await create().getSession()).toBeNull();
  });

  it('signs in with a provider and keeps the session across instances', async () => {
    const user = await create().signIn(AUTH_PROVIDER.GitHub);

    expect(user.isDemo).toBe(false);
    TestBed.resetTestingModule();
    expect(await create().getSession()).toEqual(user);
  });

  it('signs in to the demo as a demo user', async () => {
    expect((await create().signInDemo()).isDemo).toBe(true);
  });

  it('clears the session on sign-out', async () => {
    const api = create();
    await api.signIn(AUTH_PROVIDER.Google);
    await api.signOut();

    expect(await api.getSession()).toBeNull();
    expect(localStorage.getItem(MOCK_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('starts signed in when the session is seeded', async () => {
    const seeded = { id: 'e2e', name: 'E2E', email: 'e2e@example.com', image: null, isDemo: false };
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(seeded));

    // A seed from before the onboarding flag counts as an existing user (no welcome dialog).
    const session = await create().getSession();
    expect(session).toEqual({ ...seeded, onboardingCompletedAt: expect.any(String) });
    expect(session?.onboardingCompletedAt).not.toBeNull();
  });

  it('keeps a stored null onboarding flag (the welcome is still due)', async () => {
    const seeded = {
      id: 'e2e',
      name: 'E2E',
      email: 'e2e@example.com',
      image: null,
      isDemo: false,
      onboardingCompletedAt: null,
    };
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(seeded));

    expect((await create().getSession())?.onboardingCompletedAt).toBeNull();
  });

  it('signs a new user in with the welcome still due', async () => {
    expect((await create().signIn(AUTH_PROVIDER.Google)).onboardingCompletedAt).toBeNull();
  });

  it.each(['not json', '{"id":1}', 'null', '[]'])('treats %s as signed out', async (raw) => {
    localStorage.setItem(MOCK_SESSION_STORAGE_KEY, raw);

    expect(await create().getSession()).toBeNull();
  });
});
