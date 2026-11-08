import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AUTH_API } from './auth-api.token';
import { authOnly, guestOnly, redirectToSignIn } from './auth.guards';
import { AuthApi } from './models/auth-api.interface';
import { AuthUser } from './models/auth-user.interface';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

@Component({ selector: 'app-landing-stub', template: 'landing' })
class LandingStub {}
@Component({ selector: 'app-shell-stub', template: 'shell' })
class ShellStub {}
@Component({ selector: 'app-sign-in-stub', template: 'sign-in' })
class SignInStub {}

const routes: Routes = [
  { path: '', canMatch: [guestOnly], component: LandingStub },
  {
    path: '',
    canMatch: [authOnly],
    component: ShellStub,
    children: [{ path: 'links', children: [] }],
  },
  { path: 'links', canActivate: [redirectToSignIn], children: [] },
  { path: 'sign-in', canMatch: [guestOnly], component: SignInStub },
  { path: 'sign-in', redirectTo: 'links' },
];

async function setup(session: AuthUser | null) {
  const api: AuthApi = {
    getSession: vi.fn(() => Promise.resolve(session)),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: AUTH_API, useValue: api }],
  });
  return { api, harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

describe('auth guards', () => {
  it('shows the landing for a guest and the shell for a signed-in user', async () => {
    const guest = await setup(null);
    await guest.harness.navigateByUrl('/');
    expect((guest.harness.routeNativeElement as HTMLElement).textContent).toBe('landing');

    TestBed.resetTestingModule();
    const member = await setup(USER);
    await member.harness.navigateByUrl('/');
    expect((member.harness.routeNativeElement as HTMLElement).textContent).toBe('shell');
  });

  it('sends a guest on a protected URL to sign-in with the URL to return to', async () => {
    const { harness, router } = await setup(null);

    await harness.navigateByUrl('/links?tag=a');

    expect(router.url).toBe('/sign-in?returnUrl=%2Flinks%3Ftag%3Da');
  });

  it('lets a signed-in user open a protected URL', async () => {
    const { harness, router } = await setup(USER);

    await harness.navigateByUrl('/links');

    expect(router.url).toBe('/links');
  });

  it('keeps a signed-in user away from sign-in', async () => {
    const { harness, router } = await setup(USER);

    await harness.navigateByUrl('/sign-in');

    expect(router.url).toBe('/links');
  });

  it('requests the session once for several guards', async () => {
    const { api, harness } = await setup(null);

    await harness.navigateByUrl('/');
    await harness.navigateByUrl('/sign-in');

    expect(api.getSession).toHaveBeenCalledTimes(1);
  });
});
