import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AUTH_API } from './auth-api.token';
import { authOnly, guestOnly, landingGuestOnly, redirectToSignIn } from './auth.guards';
import { markSessionHint } from './session-hint';
import { AuthApi } from './models/auth-api.interface';
import { safeReturnUrl } from './safe-return-url';
import type { AuthUser } from '@shelfmark/contracts';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

@Component({ selector: 'app-landing-stub', template: 'landing' })
class LandingStub {}
@Component({ selector: 'app-shell-stub', template: 'shell' })
class ShellStub {}
@Component({ selector: 'app-sign-in-stub', template: 'sign-in' })
class SignInStub {}

const routes: Routes = [
  { path: '', canMatch: [landingGuestOnly], component: LandingStub },
  { path: 'about', component: LandingStub },
  {
    path: '',
    canMatch: [authOnly],
    component: ShellStub,
    children: [{ path: 'links', children: [] }],
  },
  { path: 'links', canActivate: [redirectToSignIn], children: [] },
  { path: 'share', canMatch: [authOnly], component: ShellStub },
  { path: 'share', canActivate: [redirectToSignIn], children: [] },
  { path: 'sign-in', canMatch: [guestOnly], component: SignInStub },
  { path: 'sign-in', redirectTo: 'links' },
];

async function setup(session: AuthUser | null, getSession = () => Promise.resolve(session)) {
  const api: AuthApi = {
    getSession: vi.fn(getSession),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), { provide: AUTH_API, useValue: api }],
  });
  return { api, harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe('auth guards', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('shows the landing for a guest and the shell for a signed-in user', async () => {
    const guest = await setup(null);
    await guest.harness.navigateByUrl('/');
    expect((guest.harness.routeNativeElement as HTMLElement).textContent).toBe('landing');

    TestBed.resetTestingModule();
    markSessionHint();
    const member = await setup(USER);
    await member.harness.navigateByUrl('/');
    expect((member.harness.routeNativeElement as HTMLElement).textContent).toBe('shell');
  });

  it('sends a guest on a protected URL to sign-in with the URL to return to', async () => {
    const { harness, router } = await setup(null);

    await harness.navigateByUrl('/links?tag=a');

    expect(router.url).toBe('/sign-in?returnUrl=%2Flinks%3Ftag%3Da');
  });

  it('keeps the whole share query for the way back after sign-in', async () => {
    const { harness, router } = await setup(null);

    await harness.navigateByUrl('/share?text=Look%20https%3A%2F%2Fexample.com%2Fa&title=Hi');

    const returnUrl = router.parseUrl(router.url).queryParams['returnUrl'];
    // The router may write a `:` unescaped; what matters is the same params after the way back.
    expect(router.parseUrl(returnUrl).queryParams).toEqual({
      text: 'Look https://example.com/a',
      title: 'Hi',
    });
    expect(safeReturnUrl(returnUrl)).toBe(returnUrl);
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

  describe('landing on a first visit (no session hint)', () => {
    it('renders the landing before the session request answers', async () => {
      const session = deferred<AuthUser | null>();
      const { api, harness } = await setup(null, () => session.promise);

      await harness.navigateByUrl('/');

      expect((harness.routeNativeElement as HTMLElement).textContent).toBe('landing');
      expect(api.getSession).toHaveBeenCalledTimes(1);
      session.resolve(null);
    });

    it('stays on the landing when the session turns out to be a guest', async () => {
      const { harness, router } = await setup(null);

      await harness.navigateByUrl('/');
      await harness.fixture.whenStable();

      expect(router.url).toBe('/');
      expect((harness.routeNativeElement as HTMLElement).textContent).toBe('landing');
    });

    it('moves to the app when a session turns up after all', async () => {
      const session = deferred<AuthUser | null>();
      const { harness, router } = await setup(null, () => session.promise);
      await harness.navigateByUrl('/');

      session.resolve(USER);
      await vi.waitFor(() => expect(router.url).toBe('/links'));
      await harness.fixture.whenStable();

      expect((harness.routeNativeElement as HTMLElement).textContent).toBe('shell');
    });

    it('leaves a page the visitor moved to meanwhile alone', async () => {
      const session = deferred<AuthUser | null>();
      const { harness, router } = await setup(null, () => session.promise);
      await harness.navigateByUrl('/');
      // A deeper URL waits for the session (as before the shortcut); then nothing moves it.
      const navigation = harness.navigateByUrl('/about');
      session.resolve(USER);
      await navigation;
      await harness.fixture.whenStable();

      expect(router.url).toBe('/about');
    });

    it('keeps a deep link of a signed-in user on a device without the hint', async () => {
      const session = deferred<AuthUser | null>();
      const { harness, router } = await setup(null, () => session.promise);

      const navigation = harness.navigateByUrl('/share?text=hi');
      session.resolve(USER);
      await navigation;
      await harness.fixture.whenStable();

      expect(router.url).toBe('/share?text=hi');
      expect((harness.routeNativeElement as HTMLElement).textContent).toBe('shell');
    });

    it('waits for the session when the device has a session hint', async () => {
      markSessionHint();
      const session = deferred<AuthUser | null>();
      const { harness, router } = await setup(null, () => session.promise);

      const navigation = harness.navigateByUrl('/');
      await Promise.resolve();
      expect(router.navigated).toBe(false);

      session.resolve(USER);
      await navigation;
      expect((harness.routeNativeElement as HTMLElement).textContent).toBe('shell');
    });
  });
});
