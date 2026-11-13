import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { ViewportService } from '../../core/layout/viewport.service';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { AuthApi } from '../../core/auth/models/auth-api.interface';
import type { AuthUser } from '@shelfmark/contracts';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { DemoSignInError } from '../../core/auth/demo-sign-in-error';
import { DEMO_ERROR } from '../../core/auth/models/demo-error.const';
import SignInPage from './sign-in.page';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

async function setup(
  signIn: AuthApi['signIn'] = () => Promise.resolve(USER),
  signInDemo?: AuthApi['signInDemo'],
  desktop = true,
) {
  const api: AuthApi = {
    getSession: () => Promise.resolve(null),
    signIn: vi.fn(signIn),
    signInDemo: vi.fn(
      signInDemo ??
        (() =>
          Promise.resolve({ ...USER, isDemo: true, demoExpiresAt: '2030-01-02T00:00:00.000Z' })),
    ),
    signOut: () => Promise.resolve(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'sign-in', component: SignInPage },
          { path: '**', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: api },
      {
        provide: ViewportService,
        useValue: { desktop: signal(desktop), wide: signal(true), huge: signal(false) },
      },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const harness = await RouterTestingHarness.create();
  return { api, harness, router: TestBed.inject(Router) };
}

/** The page's real buttons: the inert, decorative cards' own title buttons are not among them. */
function buttons(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll('button')).filter((b) => !b.closest('[inert]'));
}

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const found = buttons(root).find((b) => b.textContent?.includes(label));
  if (!found) {
    throw new Error(`No button "${label}"`);
  }
  return found;
}

describe('SignInPage', () => {
  it('offers Google, GitHub and the demo with translated text', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toBe('All your links on one shelf');
    // The email form is stage 2: only the providers and the demo.
    expect(buttons(root).map((b) => b.textContent?.trim())).toEqual([
      'Continue with Google',
      'Continue with GitHub',
      'Open the demo',
    ]);
    expect(root.querySelector('ui-notice')).toBeNull();
  });

  it('links the privacy line to /privacy', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;
    const line = root.querySelector('.sign-in__privacy');

    expect(line?.querySelector('a')?.getAttribute('href')).toBe('/privacy');
    expect(line?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'By continuing you agree to the Privacy policy. We only use your name, email and avatar.',
    );
  });

  it('shows fourteen decorative, inert drifting cards on a desktop and no mosaic band', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;
    const drift = root.querySelector('app-sign-in-drift');

    expect(drift?.getAttribute('aria-hidden')).toBe('true');
    expect(drift?.hasAttribute('inert')).toBe(true);
    expect(drift?.querySelectorAll('.sd-card')).toHaveLength(14);
    expect(drift?.textContent).toContain('Signal Forms in 20 minutes');
    expect(root.querySelector('.sign-in__art')).toBeNull();
  });

  it('shows the mosaic band instead of the drifting cards below 64em', async () => {
    const { harness } = await setup(undefined, undefined, false);
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('.sign-in__art')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('app-sign-in-drift')).toBeNull();
    // The "or" divider is a desktop card detail: not rendered on a phone.
    expect(root.querySelector('.sign-in__or')).toBeNull();
  });

  it('renders the "or" divider on a desktop', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in');

    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('.sign-in__or'),
    ).not.toBeNull();
  });

  it('has no axe violations', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in?reason=session-expired');
    const root = harness.routeNativeElement as HTMLElement;

    // Colour contrast is off (no layout in jsdom); the e2e axe run covers it once #82 lands.
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it.each([
    ['session-expired', 'Your session has expired. Sign in again.'],
    ['demo-expired', 'The demo has ended. Open a new one or sign in.'],
    ['demo-limit', 'Too many demos'],
    ['demo-unavailable', 'The demo is full'],
    ['demo-failed', 'could not open the demo'],
  ])('explains reason=%s', async (reason, text) => {
    const { harness } = await setup();
    await harness.navigateByUrl(`/sign-in?reason=${reason}`);

    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('ui-notice')?.textContent,
    ).toContain(text);
  });

  it('opens the library after the demo button and explains a rate-limited demo', async () => {
    const { api, harness, router } = await setup();
    await harness.navigateByUrl('/sign-in');
    button(harness.routeNativeElement as HTMLElement, 'demo').click();
    await harness.fixture.whenStable();
    expect(api.signInDemo).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/');

    TestBed.resetTestingModule();
    const limited = await setup(undefined, () =>
      Promise.reject(new DemoSignInError(DEMO_ERROR.RateLimited)),
    );
    await limited.harness.navigateByUrl('/sign-in');
    const root = limited.harness.routeNativeElement as HTMLElement;
    button(root, 'demo').click();
    await limited.harness.fixture.whenStable();
    limited.harness.detectChanges();

    expect(root.querySelectorAll('ui-notice')).toHaveLength(1);
    expect(root.querySelector('ui-notice')?.textContent).toContain('Too many demos');
    expect(limited.router.url).toBe('/sign-in');
  });

  it('shows one notice when the demo failed and the reason is in the URL', async () => {
    const { harness } = await setup(undefined, () =>
      Promise.reject(new DemoSignInError(DEMO_ERROR.RateLimited)),
    );
    await harness.navigateByUrl('/sign-in?reason=demo-limit');
    const root = harness.routeNativeElement as HTMLElement;
    button(root, 'demo').click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(root.querySelectorAll('ui-notice')).toHaveLength(1);
  });

  it('ignores an unknown reason', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in?reason=<b>x</b>');

    expect((harness.routeNativeElement as HTMLElement).querySelector('ui-notice')).toBeNull();
  });

  it('returns to the saved URL after signing in', async () => {
    const { api, harness, router } = await setup();
    await harness.navigateByUrl('/sign-in?returnUrl=%2Flinks%3Ftag%3Da');

    button(harness.routeNativeElement as HTMLElement, 'GitHub').click();
    await harness.fixture.whenStable();

    expect(api.signIn).toHaveBeenCalledWith('github', '/links?tag=a');
    expect(router.url).toBe('/links?tag=a');
  });

  it.each(['https://evil.test', '//evil.test', '/\\evil.test'])(
    'does not follow the unsafe returnUrl %s',
    async (returnUrl) => {
      const { harness, router } = await setup();
      await harness.navigateByUrl(`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`);

      button(harness.routeNativeElement as HTMLElement, 'Google').click();
      await harness.fixture.whenStable();

      expect(router.url).toBe('/');
    },
  );

  it.each([
    ['email_not_found', 'no verified email'],
    ['access_denied', 'was cancelled'],
    ['state_mismatch', 'Start again'],
    ['account_not_linked', 'could not be linked'],
    ['something_new', 'Sign-in did not finish'],
  ])('explains the OAuth failure error=%s', async (error, text) => {
    const { harness } = await setup();
    await harness.navigateByUrl(`/sign-in?error=${error}`);

    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('ui-notice')?.textContent,
    ).toContain(text);
  });

  it('shows nothing for a missing error', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in?error=');

    expect((harness.routeNativeElement as HTMLElement).querySelector('ui-notice')).toBeNull();
  });

  it('opens the demo', async () => {
    const { api, harness, router } = await setup();
    await harness.navigateByUrl('/sign-in');

    button(harness.routeNativeElement as HTMLElement, 'demo').click();
    await harness.fixture.whenStable();

    expect(api.signInDemo).toHaveBeenCalled();
    expect(router.url).toBe('/');
  });

  it('shows a failure notice and stays on the page', async () => {
    const { harness, router } = await setup(() => Promise.reject(new Error('denied')));
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;

    button(root, 'Google').click();
    await harness.fixture.whenStable();

    expect(root.querySelector('ui-notice')?.textContent).toContain('We could not sign you in');
    expect(router.url).toBe('/sign-in');
  });

  it('shows loading on the chosen button only and locks the others', async () => {
    let finish: (user: AuthUser) => void = () => undefined;
    const { harness } = await setup(() => new Promise<AuthUser>((resolve) => (finish = resolve)));
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;

    button(root, 'GitHub').click();
    harness.detectChanges();

    expect(button(root, 'GitHub').getAttribute('aria-busy')).toBe('true');
    expect(button(root, 'Google').getAttribute('aria-busy')).not.toBe('true');
    expect(button(root, 'Google').disabled).toBe(true);
    expect(button(root, 'demo').disabled).toBe(true);

    finish(USER);
    await harness.fixture.whenStable();
  });
});
