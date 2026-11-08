import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AUTH_API } from '../auth/auth-api.token';
import { AuthStore } from '../auth/auth.store';
import type { AuthUser } from '@shelfmark/contracts';
import { SignedInPreloadingStrategy } from './signed-in-preloading.strategy';

const route: Route = { path: 'links' };
const user: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

function setup(sessionUser: AuthUser | null) {
  const getSession = vi.fn().mockResolvedValue(sessionUser);
  const signInDemo = vi.fn().mockResolvedValue(user);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AUTH_API,
        useValue: { getSession, signIn: vi.fn(), signInDemo, signOut: vi.fn() },
      },
    ],
  });
  return { strategy: TestBed.inject(SignedInPreloadingStrategy), getSession };
}

describe('SignedInPreloadingStrategy', () => {
  it('preloads once the session shows a signed-in user', async () => {
    const { strategy } = setup(user);
    const load = vi.fn(() => of('loaded'));

    const result = await firstValueFrom(strategy.preload(route, load));

    expect(load).toHaveBeenCalledTimes(1);
    expect(result).toBe('loaded');
  });

  it('never preloads for a guest', async () => {
    const { strategy } = setup(null);
    const load = vi.fn(() => of('loaded'));

    const result = await firstValueFrom(strategy.preload(route, load), {
      defaultValue: 'skipped',
    });

    expect(load).not.toHaveBeenCalled();
    expect(result).toBe('skipped');
  });

  it('shares the one session request across routes', async () => {
    const { strategy, getSession } = setup(user);
    const load = vi.fn(() => of('loaded'));

    await firstValueFrom(strategy.preload(route, load));
    await firstValueFrom(strategy.preload(route, load));

    expect(getSession).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('preloads on the next navigation after a guest signs in', async () => {
    const { strategy } = setup(null);
    const load = vi.fn(() => of('loaded'));
    const store = TestBed.inject(AuthStore);
    await store.ensureLoaded();

    await store.signInDemo();
    await firstValueFrom(strategy.preload(route, load));

    expect(load).toHaveBeenCalledTimes(1);
  });
});
